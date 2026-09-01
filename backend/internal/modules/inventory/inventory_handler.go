package inventory

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type InventoryHandler struct{}

func NewInventoryHandler() *InventoryHandler {
	return &InventoryHandler{}
}

func (h *InventoryHandler) RegisterRoutes(r *gin.RouterGroup) {
	// Stock movements
	sm := r.Group("/stock-movements", middleware.AuthenticateToken())
	{
		sm.GET("", h.GetStockMovements)
		sm.POST("", h.CreateStockMovement)
	}

	// Stock opnames
	so := r.Group("/stock-opnames", middleware.AuthenticateToken())
	{
		so.GET("", h.GetStockOpnames)
		so.GET("/:id", h.GetStockOpnameByID)
		so.POST("", middleware.RequireRole("admin", "manager"), h.CreateStockOpname)
		so.PUT("/:id", middleware.RequireRole("admin", "manager"), h.UpdateStockOpname)
		so.PUT("/:id/items", middleware.RequireRole("admin", "manager"), h.UpdateStockOpname)
		so.POST("/:id/commit", middleware.RequireRole("admin", "manager"), h.CommitStockOpname)
		so.POST("/:id/finalize", middleware.RequireRole("admin", "manager"), h.CommitStockOpname)
		so.DELETE("/:id", middleware.RequireRole("admin", "manager"), h.DeleteStockOpname)
	}

	// Recipes (BOM)
	rec := r.Group("/recipes", middleware.AuthenticateToken())
	{
		rec.GET("", h.GetRecipes)
		rec.GET("/:productId", h.GetRecipeByProductID)
		rec.POST("/:productId", middleware.RequireRole("admin", "manager"), h.SaveRecipe)
		rec.POST("", middleware.RequireRole("admin", "manager"), h.SaveRecipeFromPost)
		rec.DELETE("/:id", middleware.RequireRole("admin", "manager"), h.DeleteRecipe)
	}

	// Consignments
	cons := r.Group("/consignment", middleware.AuthenticateToken())
	{
		cons.GET("/unsettled", h.GetConsignmentUnsettled)
		cons.POST("/settle", middleware.RequireRole("admin", "manager"), h.SettleConsignment)
		cons.GET("/settlements", h.GetConsignmentSettlements)
		cons.GET("/history", h.GetConsignmentSettlements)
	}
}

// -------------------------------------------------------------
// STOCK MOVEMENTS
// -------------------------------------------------------------

type StockMovementResp struct {
	ID            string    `json:"id" db:"id"`
	UserID        string    `json:"user_id" db:"user_id"`
	ProductID     string    `json:"product_id" db:"product_id"`
	ProductName   *string   `json:"product_name" db:"product_name"`
	ProductSKU    *string   `json:"product_sku" db:"product_sku"`
	Type          string    `json:"type" db:"type"`
	Quantity      int       `json:"quantity" db:"quantity"`
	StockBefore   int       `json:"stock_before" db:"stock_before"`
	StockAfter    int       `json:"stock_after" db:"stock_after"`
	ReferenceType *string   `json:"reference_type" db:"reference_type"`
	ReferenceID   *string   `json:"reference_id" db:"reference_id"`
	Notes         *string   `json:"notes" db:"notes"`
	CreatedBy     *string   `json:"created_by" db:"created_by"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

func (h *InventoryHandler) GetStockMovements(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	productID := c.Query("product_id")
	movType := c.Query("type")
	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")
	limitStr := c.DefaultQuery("limit", "100")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 100
	}

	query := `
		SELECT sm.id, sm.user_id, sm.product_id, sm.type, sm.quantity,
		       COALESCE(sm.stock_before, 0) as stock_before,
		       COALESCE(sm.stock_after, 0) as stock_after,
		       sm.reference_type, sm.reference_id, sm.notes, sm.created_by, sm.created_at,
		       p.name as product_name, p.sku as product_sku
		FROM stock_movements sm
		LEFT JOIN products p ON sm.product_id = p.id
		WHERE sm.user_id = $1
	`
	args := []interface{}{tenantID}
	argIdx := 2

	if productID != "" {
		query += fmt.Sprintf(" AND sm.product_id = $%d", argIdx)
		args = append(args, productID)
		argIdx++
	}
	if movType != "" {
		query += fmt.Sprintf(" AND sm.type = $%d", argIdx)
		args = append(args, movType)
		argIdx++
	}
	if fromDate != "" {
		query += fmt.Sprintf(" AND sm.created_at >= $%d", argIdx)
		args = append(args, fromDate)
		argIdx++
	}
	if toDate != "" {
		query += fmt.Sprintf(" AND sm.created_at <= $%d", argIdx)
		args = append(args, toDate)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY sm.created_at DESC LIMIT $%d", argIdx)
	args = append(args, limit)

	var list []StockMovementResp
	err := database.DB.Select(&list, query, args...)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if list == nil {
		list = []StockMovementResp{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *InventoryHandler) CreateStockMovement(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)
	tenantID := user.TenantID

	var req struct {
		ProductID string `json:"product_id"`
		Type      string `json:"type"` // 'in', 'out', 'adjustment'
		Quantity  int    `json:"quantity"`
		Notes     string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.ProductID == "" || req.Quantity <= 0 {
		utils.RespondValidationError(c, "Product ID, tipe pergerakan, dan quantity wajib diisi")
		return
	}

	if req.Type != "in" && req.Type != "out" && req.Type != "adjustment" {
		utils.RespondValidationError(c, "Tipe pergerakan tidak valid (harus in, out, atau adjustment)")
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	var product struct {
		Stock int `db:"stock"`
	}
	err = tx.Get(&product, "SELECT COALESCE(stock, 0) as stock FROM products WHERE id = $1 AND user_id = $2", req.ProductID, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Product not found")
		return
	}

	stockBefore := product.Stock
	stockAfter := stockBefore

	if req.Type == "in" {
		stockAfter = stockBefore + req.Quantity
	} else if req.Type == "out" {
		stockAfter = stockBefore - req.Quantity
		if stockAfter < 0 {
			utils.RespondError(c, http.StatusBadRequest, "Stok tidak mencukupi")
			return
		}
	} else if req.Type == "adjustment" {
		stockAfter = req.Quantity
	}

	diffQty := stockAfter - stockBefore
	if diffQty < 0 {
		diffQty = -diffQty
	}

	_, err = tx.Exec("UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3", stockAfter, req.ProductID, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	id := utils.GenerateUUID()
	_, err = tx.Exec(`
		INSERT INTO stock_movements (
			id, user_id, product_id, type, quantity, stock_before, stock_after, reference_type, notes, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, 'manual', $8, $9
		)
	`, id, tenantID, req.ProductID, req.Type, diffQty, stockBefore, stockAfter, req.Notes, user.ID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Pergerakan stok berhasil dicatat", gin.H{
		"id":           id,
		"stock_before": stockBefore,
		"stock_after":  stockAfter,
	})
}

// -------------------------------------------------------------
// STOCK OPNAMES
// -------------------------------------------------------------

type StockOpnameItem struct {
	ID              string  `json:"id" db:"id"`
	OpnameID        string  `json:"opname_id" db:"opname_id"`
	ProductID       string  `json:"product_id" db:"product_id"`
	ProductName     string  `json:"product_name" db:"product_name"`
	ProductSKU      *string `json:"product_sku" db:"product_sku"`
	SystemStock     int     `json:"system_stock" db:"system_stock"`
	PhysicalStock   int     `json:"physical_stock" db:"physical_stock"`
	DifferenceQty   int     `json:"difference_qty" db:"difference_qty"`
	UnitCost        float64 `json:"unit_cost" db:"unit_cost"`
	DifferenceValue float64 `json:"difference_value" db:"difference_value"`
	Notes           *string `json:"notes" db:"notes"`
}

type StockOpnameResp struct {
	ID           string            `json:"id" db:"id"`
	UserID       string            `json:"user_id" db:"user_id"`
	OpnameNumber string            `json:"opname_number" db:"opname_number"`
	OutletID     *string           `json:"outlet_id" db:"outlet_id"`
	Title        string            `json:"title" db:"title"`
	Status       string            `json:"status" db:"status"`
	Notes        *string           `json:"notes" db:"notes"`
	CreatedBy    *string           `json:"created_by" db:"created_by"`
	CreatedAt    time.Time         `json:"created_at" db:"created_at"`
	CompletedAt  *time.Time        `json:"completed_at" db:"completed_at"`
	Items        []StockOpnameItem `json:"items,omitempty"`
}

func (h *InventoryHandler) GetStockOpnames(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var list []StockOpnameResp
	err := database.DB.Select(&list, "SELECT * FROM stock_opnames WHERE user_id = $1 ORDER BY created_at DESC", tenantID)
	if err != nil {
		c.JSON(http.StatusOK, []StockOpnameResp{})
		return
	}
	if list == nil {
		list = []StockOpnameResp{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *InventoryHandler) GetStockOpnameByID(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var opname StockOpnameResp
	err := database.DB.Get(&opname, "SELECT * FROM stock_opnames WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Stock opname not found")
		return
	}

	var items []StockOpnameItem
	_ = database.DB.Select(&items, "SELECT * FROM stock_opname_items WHERE opname_id = $1 ORDER BY product_name ASC", id)
	if items == nil {
		items = []StockOpnameItem{}
	}
	opname.Items = items

	c.JSON(http.StatusOK, opname)
}

func (h *InventoryHandler) CreateStockOpname(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)
	tenantID := user.TenantID

	var req struct {
		Title    string `json:"title"`
		OutletID string `json:"outlet_id"`
		Notes    string `json:"notes"`
	}
	_ = c.ShouldBindJSON(&req)

	id := utils.GenerateUUID()
	dateStr := time.Now().Format("20060102")
	opnameNumber := fmt.Sprintf("SOP-%s-%d", dateStr, 1000+time.Now().UnixNano()%9000)

	title := req.Title
	if title == "" {
		title = fmt.Sprintf("Stock Opname %s", time.Now().Format("02/01/2006"))
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO stock_opnames (id, user_id, opname_number, outlet_id, title, status, notes, created_by)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5, 'draft', $6, $7)
	`, id, tenantID, opnameNumber, req.OutletID, title, req.Notes, user.FullName)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Pre-fill items with current products stock
	type ProdItem struct {
		ID        string         `db:"id"`
		Name      string         `db:"name"`
		SKU       sql.NullString `db:"sku"`
		Stock     int            `db:"stock"`
		CostPrice float64        `db:"cost"`
	}
	var products []ProdItem
	_ = tx.Select(&products, "SELECT id, name, sku, COALESCE(stock, 0) as stock, COALESCE(cost, 0) as cost FROM products WHERE user_id = $1 ORDER BY name ASC", tenantID)

	for _, p := range products {
		_, _ = tx.Exec(`
			INSERT INTO stock_opname_items (
				id, opname_id, product_id, product_name, product_sku, system_stock, physical_stock, difference_qty, unit_cost, difference_value
			) VALUES (
				$1, $2, $3, $4, $5, $6, $6, 0, $7, 0
			)
		`, utils.GenerateUUID(), id, p.ID, p.Name, p.SKU, p.Stock, p.CostPrice)
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.Params = []gin.Param{{Key: "id", Value: id}}
	h.GetStockOpnameByID(c)
}

func (h *InventoryHandler) UpdateStockOpname(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var req struct {
		Title string `json:"title"`
		Notes string `json:"notes"`
		Items []struct {
			ID            string  `json:"id"`
			SystemStock   int     `json:"system_stock"`
			PhysicalStock int     `json:"physical_stock"`
			UnitCost      float64 `json:"unit_cost"`
			Notes         string  `json:"notes"`
		} `json:"items"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Invalid data")
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE stock_opnames SET title = COALESCE(NULLIF($1, ''), title), notes = $2 WHERE id = $3 AND user_id = $4", req.Title, req.Notes, id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	for _, it := range req.Items {
		diffQty := it.PhysicalStock - it.SystemStock
		diffVal := float64(diffQty) * it.UnitCost

		_, _ = tx.Exec(`
			UPDATE stock_opname_items
			SET physical_stock = $1, difference_qty = $2, difference_value = $3, notes = $4
			WHERE id = $5 AND opname_id = $6
		`, it.PhysicalStock, diffQty, diffVal, it.Notes, it.ID, id)
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Stock opname draft saved", gin.H{"success": true})
}

func (h *InventoryHandler) CommitStockOpname(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)
	tenantID := user.TenantID
	id := c.Param("id")

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	var opname StockOpnameResp
	err = tx.Get(&opname, "SELECT * FROM stock_opnames WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Stock opname not found")
		return
	}

	if opname.Status == "completed" {
		utils.RespondError(c, http.StatusBadRequest, "Sesi Stock Opname ini sudah selesai (committed).")
		return
	}

	var items []StockOpnameItem
	_ = tx.Select(&items, "SELECT * FROM stock_opname_items WHERE opname_id = $1", id)

	for _, item := range items {
		if item.DifferenceQty != 0 {
			var currStock int
			_ = tx.Get(&currStock, "SELECT COALESCE(stock, 0) FROM products WHERE id = $1", item.ProductID)
			_, _ = tx.Exec("UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", item.PhysicalStock, item.ProductID)
			
			qtyDiff := item.DifferenceQty
			if qtyDiff < 0 {
				qtyDiff = -qtyDiff
			}
			_, _ = tx.Exec(`
				INSERT INTO stock_movements (id, user_id, product_id, type, quantity, stock_before, stock_after, reference_type, reference_id, notes, created_by)
				VALUES ($1, $2, $3, 'adjustment', $4, $5, $6, 'opname', $7, $8, $9)
			`, utils.GenerateUUID(), tenantID, item.ProductID, qtyDiff, currStock, item.PhysicalStock, id, fmt.Sprintf("Stock Opname (%s): %d", opname.OpnameNumber, item.DifferenceQty), user.ID)
		}
	}

	_, err = tx.Exec("UPDATE stock_opnames SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1", id)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Stock Opname berhasil diselesaikan dan stok sistem telah diperbarui.", gin.H{"success": true})
}

func (h *InventoryHandler) DeleteStockOpname(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	_, _ = database.DB.Exec("DELETE FROM stock_opname_items WHERE opname_id = $1", id)
	_, err := database.DB.Exec("DELETE FROM stock_opnames WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Stock opname deleted", gin.H{"success": true})
}

// -------------------------------------------------------------
// RECIPES (BOM)
// -------------------------------------------------------------

type RecipeRow struct {
	ID             string  `json:"id" db:"id"`
	UserID         string  `json:"user_id" db:"user_id"`
	ProductID      string  `json:"product_id" db:"product_id"`
	ProductName    string  `json:"product_name" db:"product_name"`
	ProductPrice   float64 `json:"product_price" db:"product_price"`
	ProductCost    float64 `json:"product_cost" db:"product_cost"`
	IngredientID   string  `json:"ingredient_id" db:"ingredient_id"`
	IngredientName string  `json:"ingredient_name" db:"ingredient_name"`
	IngredientUnit string  `json:"ingredient_unit" db:"ingredient_unit"`
	IngredientCost float64 `json:"ingredient_cost" db:"ingredient_cost"`
	Quantity       float64 `json:"quantity" db:"quantity"`
	Unit           string  `json:"unit" db:"unit"`
}

func (h *InventoryHandler) GetRecipes(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var list []RecipeRow
	err := database.DB.Select(&list, `
		SELECT r.id, r.user_id, r.product_id, r.ingredient_id, r.quantity, r.unit,
		       p.name as product_name, COALESCE(p.price, 0) as product_price, COALESCE(p.cost, 0) as product_cost,
		       ing.name as ingredient_name, COALESCE(ing.unit, 'pcs') as ingredient_unit, COALESCE(ing.cost, 0) as ingredient_cost
		FROM recipes r
		JOIN products p ON r.product_id = p.id
		JOIN products ing ON r.ingredient_id = ing.id
		WHERE r.user_id = $1
		ORDER BY p.name ASC
	`, tenantID)

	if err != nil {
		c.JSON(http.StatusOK, []RecipeRow{})
		return
	}
	if list == nil {
		list = []RecipeRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *InventoryHandler) GetRecipeByProductID(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	productID := c.Param("productId")

	var list []RecipeRow
	err := database.DB.Select(&list, `
		SELECT r.id, r.user_id, r.product_id, r.ingredient_id, r.quantity, r.unit,
		       p.name as product_name, COALESCE(p.price, 0) as product_price, COALESCE(p.cost, 0) as product_cost,
		       ing.name as ingredient_name, COALESCE(ing.unit, 'pcs') as ingredient_unit, COALESCE(ing.cost, 0) as ingredient_cost
		FROM recipes r
		JOIN products p ON r.product_id = p.id
		JOIN products ing ON r.ingredient_id = ing.id
		WHERE r.product_id = $1 AND r.user_id = $2
	`, productID, tenantID)

	if err != nil {
		c.JSON(http.StatusOK, []RecipeRow{})
		return
	}
	if list == nil {
		list = []RecipeRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *InventoryHandler) SaveRecipe(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	productID := c.Param("productId")

	var req struct {
		Ingredients []struct {
			IngredientID string  `json:"ingredient_id"`
			Quantity     float64 `json:"quantity"`
			Unit         string  `json:"unit"`
		} `json:"ingredients"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Invalid recipe payload")
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	_, _ = tx.Exec("DELETE FROM recipes WHERE product_id = $1 AND user_id = $2", productID, tenantID)

	totalCost := 0.0
	for _, ing := range req.Ingredients {
		if ing.IngredientID != "" && ing.Quantity > 0 {
			unit := ing.Unit
			if unit == "" {
				unit = "pcs"
			}
			_, _ = tx.Exec(`
				INSERT INTO recipes (id, user_id, product_id, ingredient_id, quantity, unit)
				VALUES ($1, $2, $3, $4, $5, $6)
			`, utils.GenerateUUID(), tenantID, productID, ing.IngredientID, ing.Quantity, unit)

			var ingCost float64
			_ = tx.Get(&ingCost, "SELECT COALESCE(cost, 0) FROM products WHERE id = $1", ing.IngredientID)
			totalCost += ingCost * ing.Quantity
		}
	}

	if totalCost > 0 {
		_, _ = tx.Exec("UPDATE products SET cost = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3", totalCost, productID, tenantID)
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Recipe saved successfully", gin.H{"success": true})
}

func (h *InventoryHandler) SaveRecipeFromPost(c *gin.Context) {
	var req struct {
		ProductID   string `json:"product_id"`
		Ingredients []struct {
			IngredientID string  `json:"ingredient_id"`
			Quantity     float64 `json:"quantity"`
			Unit         string  `json:"unit"`
		} `json:"ingredients"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.ProductID == "" {
		utils.RespondValidationError(c, "Product ID is required")
		return
	}
	c.Params = []gin.Param{{Key: "productId", Value: req.ProductID}}
	h.SaveRecipe(c)
}

func (h *InventoryHandler) DeleteRecipe(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM recipes WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Recipe item deleted", gin.H{"success": true})
}

// -------------------------------------------------------------
// CONSIGNMENT SETTLEMENTS
// -------------------------------------------------------------

func (h *InventoryHandler) GetConsignmentUnsettled(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	type UnsettledSupplier struct {
		Supplier             string     `json:"supplier" db:"supplier"`
		ItemCount            int        `json:"item_count" db:"item_count"`
		TotalQuantity        int        `json:"total_quantity" db:"total_quantity"`
		TotalDebt            float64    `json:"total_debt" db:"total_debt"`
		TotalSales           float64    `json:"total_sales" db:"total_sales"`
		FirstTransactionDate *time.Time `json:"first_transaction_date" db:"first_transaction_date"`
		LastTransactionDate  *time.Time `json:"last_transaction_date" db:"last_transaction_date"`
	}

	var results []UnsettledSupplier
	err := database.DB.Select(&results, `
		SELECT 
			p.supplier,
			COUNT(ti.id) as item_count,
			COALESCE(SUM(ti.quantity), 0) as total_quantity,
			COALESCE(SUM(COALESCE(ti.quantity, 1) * COALESCE(NULLIF(p.cost, 0), ti.cost_price, 0)), 0) as total_debt,
			COALESCE(SUM(ti.subtotal), 0) as total_sales,
			MIN(t.created_at) as first_transaction_date,
			MAX(t.created_at) as last_transaction_date
		FROM transaction_items ti
		JOIN transactions t ON ti.transaction_id = t.id
		JOIN products p ON ti.product_id = p.id
		WHERE p.ownership_type = 'consignment'
		  AND ti.consignment_settlement_id IS NULL
		  AND t.status = 'completed'
		  AND p.supplier IS NOT NULL
		  AND p.supplier != ''
		  AND p.user_id = $1
		  AND t.user_id = $1
		GROUP BY p.supplier
		ORDER BY total_debt DESC
	`, tenantID)

	if err != nil {
		c.JSON(http.StatusOK, []UnsettledSupplier{})
		return
	}
	if results == nil {
		results = []UnsettledSupplier{}
	}
	c.JSON(http.StatusOK, results)
}

func (h *InventoryHandler) SettleConsignment(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Supplier  string  `json:"supplier"`
		PeriodEnd string  `json:"period_end"`
		Notes     *string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Supplier == "" {
		utils.RespondValidationError(c, "Supplier name is required")
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	// Parse period_end if provided
	var endDate time.Time
	if req.PeriodEnd != "" {
		t, err := time.Parse("2006-01-02", req.PeriodEnd)
		if err == nil {
			endDate = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, time.Local)
		} else {
			endDate = time.Now()
		}
	} else {
		endDate = time.Now()
	}

	type ItemToSettle struct {
		ID        string    `db:"id"`
		Quantity  int       `db:"quantity"`
		Cost      float64   `db:"cost"`
		CreatedAt time.Time `db:"created_at"`
	}

	var items []ItemToSettle
	err = tx.Select(&items, `
		SELECT ti.id, ti.quantity, COALESCE(NULLIF(p.cost, 0), ti.cost_price, 0) as cost, t.created_at
		FROM transaction_items ti
		JOIN transactions t ON ti.transaction_id = t.id
		JOIN products p ON ti.product_id = p.id
		WHERE p.ownership_type = 'consignment'
		  AND ti.consignment_settlement_id IS NULL
		  AND t.status = 'completed'
		  AND p.supplier = $1
		  AND t.created_at <= $2
		  AND p.user_id = $3
		  AND t.user_id = $3
	`, req.Supplier, endDate, tenantID)

	if err != nil || len(items) == 0 {
		utils.RespondError(c, http.StatusBadRequest, "Tidak ada item konsinyasi yang belum dibayar untuk supplier ini pada periode yang dipilih")
		return
	}

	var totalAmount float64
	var totalQuantity int
	minDate := items[0].CreatedAt

	for _, item := range items {
		totalAmount += float64(item.Quantity) * item.Cost
		totalQuantity += item.Quantity
		if item.CreatedAt.Before(minDate) {
			minDate = item.CreatedAt
		}
	}

	settlementID := utils.GenerateUUID()
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	_, err = tx.Exec(`
		INSERT INTO consignment_settlements (
			id, user_id, supplier_name, total_amount, total_quantity, settlement_date, period_start, period_end, notes, created_by
		) VALUES (
			$1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9
		)
	`, settlementID, tenantID, req.Supplier, totalAmount, totalQuantity, minDate, endDate, req.Notes, user.ID)

	if err != nil {
		// Fallback without extra columns if schema differs
		_, err = tx.Exec(`
			INSERT INTO consignment_settlements (
				id, user_id, supplier_name, total_amount, settlement_date, notes
			) VALUES (
				$1, $2, $3, $4, CURRENT_TIMESTAMP, $5
			)
		`, settlementID, tenantID, req.Supplier, totalAmount, req.Notes)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// Update items with settlement ID
	_, err = tx.Exec(`
		UPDATE transaction_items ti
		SET consignment_settlement_id = $1
		FROM products p, transactions t
		WHERE ti.product_id = p.id
		  AND ti.transaction_id = t.id
		  AND p.ownership_type = 'consignment'
		  AND ti.consignment_settlement_id IS NULL
		  AND t.status = 'completed'
		  AND p.supplier = $2
		  AND t.created_at <= $3
		  AND p.user_id = $4
		  AND t.user_id = $4
	`, settlementID, req.Supplier, endDate, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Hutang konsinyasi berhasil dilunasi", gin.H{
		"settlementId": settlementID,
		"totalAmount":  totalAmount,
		"count":        len(items),
	})
}

func (h *InventoryHandler) GetConsignmentSettlements(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	type SettlementRow struct {
		ID             string     `json:"id" db:"id"`
		UserID         string     `json:"user_id" db:"user_id"`
		SupplierName   string     `json:"supplier_name" db:"supplier_name"`
		TotalAmount    float64    `json:"total_amount" db:"total_amount"`
		TotalQuantity  int        `json:"total_quantity" db:"total_quantity"`
		SettlementDate time.Time  `json:"settlement_date" db:"settlement_date"`
		PeriodStart    *time.Time `json:"period_start" db:"period_start"`
		PeriodEnd      *time.Time `json:"period_end" db:"period_end"`
		Notes          *string    `json:"notes" db:"notes"`
		CreatedBy      *string    `json:"created_by" db:"created_by"`
	}

	var list []SettlementRow
	err := database.DB.Select(&list, `
		SELECT id, user_id, supplier_name, total_amount,
		       COALESCE(total_quantity, 0) as total_quantity,
		       settlement_date, period_start, period_end, notes, created_by
		FROM consignment_settlements
		WHERE user_id = $1
		ORDER BY settlement_date DESC
	`, tenantID)

	if err != nil {
		type SimpleRow struct {
			ID             string    `json:"id" db:"id"`
			UserID         string    `json:"user_id" db:"user_id"`
			SupplierName   string    `json:"supplier_name" db:"supplier_name"`
			TotalAmount    float64   `json:"total_amount" db:"total_amount"`
			SettlementDate time.Time `json:"settlement_date" db:"settlement_date"`
			Notes          *string   `json:"notes" db:"notes"`
		}
		var simpleList []SimpleRow
		_ = database.DB.Select(&simpleList, "SELECT id, user_id, supplier_name, total_amount, settlement_date, notes FROM consignment_settlements WHERE user_id = $1 ORDER BY settlement_date DESC", tenantID)
		if simpleList == nil {
			simpleList = []SimpleRow{}
		}
		c.JSON(http.StatusOK, simpleList)
		return
	}
	if list == nil {
		list = []SettlementRow{}
	}
	c.JSON(http.StatusOK, list)
}
