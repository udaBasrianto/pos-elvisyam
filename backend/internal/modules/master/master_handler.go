package master

import (
	"net/http"
	"time"

	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type MasterHandler struct{}

func NewMasterHandler() *MasterHandler {
	return &MasterHandler{}
}

func (h *MasterHandler) RegisterRoutes(r *gin.RouterGroup) {
	// Categories
	cat := r.Group("/categories", middleware.AuthenticateToken())
	{
		cat.GET("", h.GetCategories)
		cat.POST("", middleware.RequireRole("admin", "manager"), h.CreateCategory)
		cat.PUT("/:id", middleware.RequireRole("admin", "manager"), h.UpdateCategory)
		cat.DELETE("/:id", middleware.RequireRole("admin", "manager"), h.DeleteCategory)
	}

	// Brands
	brands := r.Group("/brands", middleware.AuthenticateToken())
	{
		brands.GET("", h.GetBrands)
		brands.POST("", middleware.RequireRole("admin", "manager"), h.CreateBrand)
		brands.PUT("/:id", middleware.RequireRole("admin", "manager"), h.UpdateBrand)
		brands.DELETE("/:id", middleware.RequireRole("admin", "manager"), h.DeleteBrand)
	}

	// Suppliers
	suppliers := r.Group("/suppliers", middleware.AuthenticateToken())
	{
		suppliers.GET("", h.GetSuppliers)
		suppliers.POST("", middleware.RequireRole("admin", "manager"), h.CreateSupplier)
		suppliers.PUT("/:id", middleware.RequireRole("admin", "manager"), h.UpdateSupplier)
		suppliers.DELETE("/:id", middleware.RequireRole("admin", "manager"), h.DeleteSupplier)
	}

	// Customers
	customers := r.Group("/customers", middleware.AuthenticateToken())
	{
		customers.GET("", h.GetCustomers)
		customers.GET("/:id", h.GetCustomerByID)
		customers.POST("", middleware.RequireRole("admin", "manager", "kasir"), h.CreateCustomer)
		customers.PUT("/:id", middleware.RequireRole("admin", "manager"), h.UpdateCustomer)
		customers.DELETE("/:id", middleware.RequireRole("admin", "manager"), h.DeleteCustomer)
		customers.GET("/:id/points", h.GetCustomerPointHistory)
		customers.GET("/:id/point-history", h.GetCustomerPointHistory)
		customers.POST("/:id/points", middleware.RequireRole("admin", "manager"), h.AdjustCustomerPoints)
	}

	// Discounts & Promo codes
	discounts := r.Group("/discounts", middleware.AuthenticateToken())
	{
		discounts.GET("", h.GetDiscounts)
		discounts.POST("", middleware.RequireRole("admin", "manager"), h.CreateDiscount)
		discounts.PUT("/:id", middleware.RequireRole("admin", "manager"), h.UpdateDiscount)
		discounts.DELETE("/:id", middleware.RequireRole("admin", "manager"), h.DeleteDiscount)
	}

	promo := r.Group("/promo-codes", middleware.AuthenticateToken())
	{
		promo.GET("", h.GetPromoCodes)
		promo.POST("", middleware.RequireRole("admin", "manager"), h.CreatePromoCode)
		promo.DELETE("/:id", middleware.RequireRole("admin", "manager"), h.DeletePromoCode)
		promo.POST("/validate", h.ValidatePromoCode)
	}
}

// -------------------------------------------------------------
// CATEGORIES
// -------------------------------------------------------------

func (h *MasterHandler) GetCategories(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	type CategoryRow struct {
		ID           string     `json:"id" db:"id"`
		UserID       string     `json:"user_id" db:"user_id"`
		Name         string     `json:"name" db:"name"`
		Description  *string    `json:"description" db:"description"`
		Color        *string    `json:"color" db:"color"`
		ProductCount int        `json:"product_count" db:"product_count"`
		CreatedAt    *time.Time `json:"created_at" db:"created_at"`
		UpdatedAt    *time.Time `json:"updated_at" db:"updated_at"`
	}

	var categories []CategoryRow
	err := database.DB.Select(&categories, `
		SELECT c.id, c.user_id, c.name, c.description, c.color,
		       COALESCE(c.created_at, CURRENT_TIMESTAMP) as created_at,
		       COALESCE(c.updated_at, CURRENT_TIMESTAMP) as updated_at,
		       (SELECT COUNT(*) FROM products WHERE category_id = c.id AND user_id = $1) as product_count
		FROM categories c
		WHERE c.user_id = $1
		ORDER BY c.name ASC
	`, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if categories == nil {
		categories = []CategoryRow{}
	}
	c.JSON(http.StatusOK, categories)
}

func (h *MasterHandler) CreateCategory(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Color       string `json:"color"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		utils.RespondValidationError(c, "Nama kategori wajib diisi")
		return
	}

	id := utils.GenerateUUID()
	color := req.Color
	if color == "" {
		color = "#6366f1"
	}

	_, err := database.DB.Exec(`
		INSERT INTO categories (id, user_id, name, description, color)
		VALUES ($1, $2, $3, $4, $5)
	`, id, tenantID, req.Name, req.Description, color)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          id,
		"user_id":     tenantID,
		"name":        req.Name,
		"description": req.Description,
		"color":       color,
	})
}

func (h *MasterHandler) UpdateCategory(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Color       string `json:"color"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		utils.RespondValidationError(c, "Nama kategori wajib diisi")
		return
	}

	color := req.Color
	if color == "" {
		color = "#6366f1"
	}

	_, err := database.DB.Exec(`
		UPDATE categories
		SET name = $1, description = $2, color = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4 AND user_id = $5
	`, req.Name, req.Description, color, id, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Category updated successfully", nil)
}

func (h *MasterHandler) DeleteCategory(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	// Set category_id in products to NULL
	_, _ = database.DB.Exec("UPDATE products SET category_id = NULL, category = NULL WHERE category_id = $1 AND user_id = $2", id, tenantID)
	_, err := database.DB.Exec("DELETE FROM categories WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Category deleted successfully", nil)
}

// -------------------------------------------------------------
// BRANDS
// -------------------------------------------------------------

func (h *MasterHandler) GetBrands(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	type BrandRow struct {
		ID          string     `json:"id" db:"id"`
		UserID      string     `json:"user_id" db:"user_id"`
		Name        string     `json:"name" db:"name"`
		Description *string    `json:"description" db:"description"`
		CreatedAt   *time.Time `json:"created_at" db:"created_at"`
		UpdatedAt   *time.Time `json:"updated_at" db:"updated_at"`
	}

	var brands []BrandRow
	err := database.DB.Select(&brands, `
		SELECT id, user_id, name, description,
		       COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
		       COALESCE(updated_at, CURRENT_TIMESTAMP) as updated_at
		FROM brands
		WHERE user_id = $1
		ORDER BY name ASC
	`, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if brands == nil {
		brands = []BrandRow{}
	}
	c.JSON(http.StatusOK, brands)
}

func (h *MasterHandler) CreateBrand(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		utils.RespondValidationError(c, "Nama brand wajib diisi")
		return
	}

	id := utils.GenerateUUID()
	_, err := database.DB.Exec(`
		INSERT INTO brands (id, user_id, name, description)
		VALUES ($1, $2, $3, $4)
	`, id, tenantID, req.Name, req.Description)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          id,
		"user_id":     tenantID,
		"name":        req.Name,
		"description": req.Description,
	})
}

func (h *MasterHandler) UpdateBrand(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		utils.RespondValidationError(c, "Nama brand wajib diisi")
		return
	}

	_, err := database.DB.Exec(`
		UPDATE brands
		SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND user_id = $4
	`, req.Name, req.Description, id, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Brand updated successfully", nil)
}

func (h *MasterHandler) DeleteBrand(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	_, _ = database.DB.Exec("UPDATE products SET brand_id = NULL, brand = NULL WHERE brand_id = $1 AND user_id = $2", id, tenantID)
	_, err := database.DB.Exec("DELETE FROM brands WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Brand deleted successfully", nil)
}

// -------------------------------------------------------------
// SUPPLIERS
// -------------------------------------------------------------

func (h *MasterHandler) GetSuppliers(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	type SupplierRow struct {
		ID          string     `json:"id" db:"id"`
		UserID      string     `json:"user_id" db:"user_id"`
		Name        string     `json:"name" db:"name"`
		ContactName *string    `json:"contact_name" db:"contact_name"`
		Email       *string    `json:"email" db:"email"`
		Phone       *string    `json:"phone" db:"phone"`
		Address     *string    `json:"address" db:"address"`
		Notes       *string    `json:"notes" db:"notes"`
		CreatedAt   *time.Time `json:"created_at" db:"created_at"`
		UpdatedAt   *time.Time `json:"updated_at" db:"updated_at"`
	}

	var suppliers []SupplierRow
	err := database.DB.Select(&suppliers, `
		SELECT id, user_id, name, contact_name, email, phone, address, notes,
		       COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
		       COALESCE(updated_at, CURRENT_TIMESTAMP) as updated_at
		FROM suppliers
		WHERE user_id = $1
		ORDER BY name ASC
	`, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if suppliers == nil {
		suppliers = []SupplierRow{}
	}
	c.JSON(http.StatusOK, suppliers)
}

func (h *MasterHandler) CreateSupplier(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Name        string `json:"name"`
		ContactName string `json:"contact_name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		Address     string `json:"address"`
		Notes       string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		utils.RespondValidationError(c, "Nama supplier wajib diisi")
		return
	}

	id := utils.GenerateUUID()
	_, err := database.DB.Exec(`
		INSERT INTO suppliers (id, user_id, name, contact_name, email, phone, address, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, id, tenantID, req.Name, req.ContactName, req.Email, req.Phone, req.Address, req.Notes)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           id,
		"user_id":      tenantID,
		"name":         req.Name,
		"contact_name": req.ContactName,
		"email":        req.Email,
		"phone":        req.Phone,
		"address":      req.Address,
		"notes":        req.Notes,
	})
}

func (h *MasterHandler) UpdateSupplier(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var req struct {
		Name        string `json:"name"`
		ContactName string `json:"contact_name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		Address     string `json:"address"`
		Notes       string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		utils.RespondValidationError(c, "Nama supplier wajib diisi")
		return
	}

	_, err := database.DB.Exec(`
		UPDATE suppliers
		SET name = $1, contact_name = $2, email = $3, phone = $4, address = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
		WHERE id = $7 AND user_id = $8
	`, req.Name, req.ContactName, req.Email, req.Phone, req.Address, req.Notes, id, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Supplier updated successfully", nil)
}

func (h *MasterHandler) DeleteSupplier(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	_, _ = database.DB.Exec("UPDATE products SET supplier_id = NULL, supplier = NULL WHERE supplier_id = $1 AND user_id = $2", id, tenantID)
	_, err := database.DB.Exec("DELETE FROM suppliers WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Supplier deleted successfully", nil)
}

// -------------------------------------------------------------
// CUSTOMERS
// -------------------------------------------------------------

type Customer struct {
	ID             string     `json:"id" db:"id"`
	UserID         string     `json:"user_id" db:"user_id"`
	Name           string     `json:"name" db:"name"`
	Email          *string    `json:"email" db:"email"`
	Phone          *string    `json:"phone" db:"phone"`
	Address        *string    `json:"address" db:"address"`
	Notes          *string    `json:"notes" db:"notes"`
	Balance        float64    `json:"balance" db:"balance"`
	TotalPurchases float64    `json:"total_purchases" db:"total_purchases"`
	TotalSpent     float64    `json:"total_spent" db:"total_spent"`
	Points         int        `json:"points" db:"points"`
	IsMember       bool       `json:"is_member" db:"is_member"`
	MemberTier     string     `json:"member_tier" db:"member_tier"`
	Status         string     `json:"status" db:"status"`
	CreatedAt      *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at" db:"updated_at"`
}

func (h *MasterHandler) GetCustomers(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var customers []Customer
	err := database.DB.Select(&customers, `
		SELECT id, user_id, name, email, phone, address, notes,
		       COALESCE(balance, 0)::float8 as balance,
		       COALESCE(total_purchases, 0)::float8 as total_purchases,
		       COALESCE(total_spent, 0)::float8 as total_spent,
		       COALESCE(points, 0) as points,
		       COALESCE(is_member, false) as is_member,
		       COALESCE(member_tier, 'silver') as member_tier,
		       COALESCE(status, 'active') as status,
		       COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
		       COALESCE(updated_at, CURRENT_TIMESTAMP) as updated_at
		FROM customers
		WHERE user_id = $1
		ORDER BY name ASC
	`, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if customers == nil {
		customers = []Customer{}
	}
	c.JSON(http.StatusOK, customers)
}

func (h *MasterHandler) GetCustomerByID(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var cust Customer
	err := database.DB.Get(&cust, `
		SELECT id, user_id, name, email, phone, address, notes,
		       COALESCE(balance, 0)::float8 as balance,
		       COALESCE(total_purchases, 0)::float8 as total_purchases,
		       COALESCE(total_spent, 0)::float8 as total_spent,
		       COALESCE(points, 0) as points,
		       COALESCE(is_member, false) as is_member,
		       COALESCE(member_tier, 'silver') as member_tier,
		       COALESCE(status, 'active') as status,
		       COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
		       COALESCE(updated_at, CURRENT_TIMESTAMP) as updated_at
		FROM customers
		WHERE id = $1 AND user_id = $2
	`, id, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Customer not found")
		return
	}
	c.JSON(http.StatusOK, cust)
}

func (h *MasterHandler) CreateCustomer(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Name       string  `json:"name"`
		Email      string  `json:"email"`
		Phone      string  `json:"phone"`
		Address    string  `json:"address"`
		Notes      string  `json:"notes"`
		IsMember   bool    `json:"is_member"`
		MemberTier string  `json:"member_tier"`
		Balance    float64 `json:"balance"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		utils.RespondValidationError(c, "Nama customer wajib diisi")
		return
	}

	id := utils.GenerateUUID()
	memberTier := req.MemberTier
	if memberTier == "" {
		memberTier = "silver"
	}

	_, err := database.DB.Exec(`
		INSERT INTO customers (id, user_id, name, email, phone, address, notes, is_member, member_tier, balance, points)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0)
	`, id, tenantID, req.Name, req.Email, req.Phone, req.Address, req.Notes, req.IsMember, memberTier, req.Balance)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	h.GetCustomerByID(c)
}

func (h *MasterHandler) UpdateCustomer(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var req struct {
		Name       string  `json:"name"`
		Email      string  `json:"email"`
		Phone      string  `json:"phone"`
		Address    string  `json:"address"`
		Notes      string  `json:"notes"`
		IsMember   bool    `json:"is_member"`
		MemberTier string  `json:"member_tier"`
		Status     string  `json:"status"`
		Balance    float64 `json:"balance"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		utils.RespondValidationError(c, "Nama customer wajib diisi")
		return
	}

	status := req.Status
	if status == "" {
		status = "active"
	}
	memberTier := req.MemberTier
	if memberTier == "" {
		memberTier = "silver"
	}

	_, err := database.DB.Exec(`
		UPDATE customers
		SET name = $1, email = $2, phone = $3, address = $4, notes = $5,
		    is_member = $6, member_tier = $7, status = $8, balance = $9, updated_at = CURRENT_TIMESTAMP
		WHERE id = $10 AND user_id = $11
	`, req.Name, req.Email, req.Phone, req.Address, req.Notes, req.IsMember, memberTier, status, req.Balance, id, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Customer updated successfully", nil)
}

func (h *MasterHandler) DeleteCustomer(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM customers WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Customer deleted successfully", nil)
}

func (h *MasterHandler) GetCustomerPointHistory(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	type PointRecord struct {
		ID            string    `json:"id" db:"id"`
		TenantID      string    `json:"tenant_id" db:"tenant_id"`
		CustomerID    string    `json:"customer_id" db:"customer_id"`
		TransactionID *string   `json:"transaction_id" db:"transaction_id"`
		Type          string    `json:"type" db:"type"`
		Points        int       `json:"points" db:"points"`
		Amount        float64   `json:"amount" db:"amount"`
		Notes         *string   `json:"notes" db:"notes"`
		CreatedAt     time.Time `json:"created_at" db:"created_at"`
	}

	var history []PointRecord
	err := database.DB.Select(&history, `
		SELECT id, tenant_id, customer_id, transaction_id, type, points, amount, notes, created_at
		FROM point_history
		WHERE customer_id = $1 AND tenant_id = $2
		ORDER BY created_at DESC
	`, id, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if history == nil {
		history = []PointRecord{}
	}
	c.JSON(http.StatusOK, history)
}

func (h *MasterHandler) AdjustCustomerPoints(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var req struct {
		Type   string `json:"type"` // 'add' or 'redeem'
		Points int    `json:"points"`
		Notes  string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Points <= 0 {
		utils.RespondValidationError(c, "Jumlah poin harus lebih dari 0")
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	multiplier := 1
	if req.Type == "redeem" || req.Type == "subtract" {
		multiplier = -1
	}

	pointDiff := req.Points * multiplier

	_, err = tx.Exec("UPDATE customers SET points = GREATEST(0, COALESCE(points, 0) + $1) WHERE id = $2 AND user_id = $3", pointDiff, id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	_, err = tx.Exec(`
		INSERT INTO point_history (id, tenant_id, customer_id, type, points, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, utils.GenerateUUID(), tenantID, id, req.Type, req.Points, req.Notes)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Points adjusted successfully", nil)
}

// -------------------------------------------------------------
// DISCOUNTS & PROMO CODES
// -------------------------------------------------------------

func (h *MasterHandler) GetDiscounts(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	type DiscountRow struct {
		ID        string    `json:"id" db:"id"`
		UserID    string    `json:"user_id" db:"user_id"`
		Name      string    `json:"name" db:"name"`
		Type      string    `json:"type" db:"type"`
		Value     float64   `json:"value" db:"value"`
		IsActive  bool      `json:"is_active" db:"is_active"`
		CreatedAt time.Time `json:"created_at" db:"created_at"`
	}

	var discounts []DiscountRow
	err := database.DB.Select(&discounts, "SELECT id, user_id, name, type, value, is_active, created_at FROM discounts WHERE user_id = $1 ORDER BY name ASC", tenantID)
	if err != nil {
		// Return empty list if table not populated
		c.JSON(http.StatusOK, []DiscountRow{})
		return
	}
	if discounts == nil {
		discounts = []DiscountRow{}
	}
	c.JSON(http.StatusOK, discounts)
}

func (h *MasterHandler) CreateDiscount(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Name     string  `json:"name"`
		Type     string  `json:"type"`
		Value    float64 `json:"value"`
		IsActive bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		utils.RespondValidationError(c, "Nama diskon wajib diisi")
		return
	}

	id := utils.GenerateUUID()
	_, err := database.DB.Exec(`
		INSERT INTO discounts (id, user_id, name, type, value, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, id, tenantID, req.Name, req.Type, req.Value, req.IsActive)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":        id,
		"user_id":   tenantID,
		"name":      req.Name,
		"type":      req.Type,
		"value":     req.Value,
		"is_active": req.IsActive,
	})
}

func (h *MasterHandler) UpdateDiscount(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var req struct {
		Name     string  `json:"name"`
		Type     string  `json:"type"`
		Value    float64 `json:"value"`
		IsActive bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		utils.RespondValidationError(c, "Nama diskon wajib diisi")
		return
	}

	_, err := database.DB.Exec(`
		UPDATE discounts
		SET name = $1, type = $2, value = $3, is_active = $4
		WHERE id = $5 AND user_id = $6
	`, req.Name, req.Type, req.Value, req.IsActive, id, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Discount updated successfully", nil)
}

func (h *MasterHandler) DeleteDiscount(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM discounts WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Discount deleted successfully", nil)
}

func (h *MasterHandler) GetPromoCodes(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	type PromoRow struct {
		ID        string     `json:"id" db:"id"`
		TenantID  string     `json:"tenant_id" db:"tenant_id"`
		Code      string     `json:"code" db:"code"`
		Discount  float64    `json:"discount" db:"discount"`
		Type      string     `json:"type" db:"type"`
		MinSpend  float64    `json:"min_spend" db:"min_spend"`
		ExpiresAt *time.Time `json:"expires_at" db:"expires_at"`
		IsActive  bool       `json:"is_active" db:"is_active"`
		CreatedAt time.Time  `json:"created_at" db:"created_at"`
	}

	var promos []PromoRow
	err := database.DB.Select(&promos, "SELECT * FROM promo_codes WHERE tenant_id = $1 ORDER BY created_at DESC", tenantID)
	if err != nil {
		c.JSON(http.StatusOK, []PromoRow{})
		return
	}
	if promos == nil {
		promos = []PromoRow{}
	}
	c.JSON(http.StatusOK, promos)
}

func (h *MasterHandler) CreatePromoCode(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Code      string     `json:"code"`
		Discount  float64    `json:"discount"`
		Type      string     `json:"type"`
		MinSpend  float64    `json:"min_spend"`
		ExpiresAt *time.Time `json:"expires_at"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Code == "" {
		utils.RespondValidationError(c, "Kode promo wajib diisi")
		return
	}

	id := utils.GenerateUUID()
	promoType := req.Type
	if promoType == "" {
		promoType = "percentage"
	}

	_, err := database.DB.Exec(`
		INSERT INTO promo_codes (id, tenant_id, code, discount, type, min_spend, expires_at, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, true)
	`, id, tenantID, req.Code, req.Discount, promoType, req.MinSpend, req.ExpiresAt)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":        id,
		"tenant_id": tenantID,
		"code":      req.Code,
		"discount":  req.Discount,
		"type":      promoType,
	})
}

func (h *MasterHandler) DeletePromoCode(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM promo_codes WHERE id = $1 AND tenant_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Promo code deleted", nil)
}

func (h *MasterHandler) ValidatePromoCode(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Code   string  `json:"code"`
		Amount float64 `json:"amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Code == "" {
		utils.RespondValidationError(c, "Kode promo wajib diisi")
		return
	}

	type PromoResult struct {
		ID        string     `db:"id"`
		Code      string     `db:"code"`
		Discount  float64    `db:"discount"`
		Type      string     `db:"type"`
		MinSpend  float64    `db:"min_spend"`
		ExpiresAt *time.Time `db:"expires_at"`
		IsActive  bool       `db:"is_active"`
	}

	var promo PromoResult
	err := database.DB.Get(&promo, "SELECT id, code, discount, type, min_spend, expires_at, is_active FROM promo_codes WHERE code = $1 AND tenant_id = $2 AND is_active = true", req.Code, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "Kode promo tidak valid")
		return
	}

	if promo.ExpiresAt != nil && time.Now().After(*promo.ExpiresAt) {
		utils.RespondError(c, http.StatusBadRequest, "Kode promo telah kedaluwarsa")
		return
	}

	if req.Amount < promo.MinSpend {
		utils.RespondError(c, http.StatusBadRequest, "Total belanja belum mencapai batas minimal")
		return
	}

	discountAmount := promo.Discount
	if promo.Type == "percentage" {
		discountAmount = (req.Amount * promo.Discount) / 100
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":           true,
		"discount_amount": discountAmount,
		"promo":           promo,
	})
}
