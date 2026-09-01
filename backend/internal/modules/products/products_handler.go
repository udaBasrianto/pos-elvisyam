package products

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type ProductsHandler struct{}

func NewProductsHandler() *ProductsHandler {
	return &ProductsHandler{}
}

func (h *ProductsHandler) RegisterRoutes(r *gin.RouterGroup) {
	prod := r.Group("/products", middleware.AuthenticateToken())
	{
		prod.GET("", h.GetProducts)
		prod.POST("/upload-image", h.UploadProductImage)
		prod.GET("/:id", h.GetProductByID)
		prod.POST("", middleware.RequireRole("admin", "manager"), h.CreateProduct)
		prod.PUT("/:id", middleware.RequireRole("admin", "manager"), h.UpdateProduct)
		prod.DELETE("/:id", middleware.RequireRole("admin", "manager"), h.DeleteProduct)
		prod.POST("/:id/image", h.UploadProductImageByID)
	}

	// Direct upload routes
	r.POST("/upload/product-image", middleware.AuthenticateToken(), h.UploadProductImage)
	r.POST("/admin/upload-image", middleware.AuthenticateToken(), h.UploadProductImage)
}

type ProductResponse struct {
	ID               string     `json:"id" db:"id"`
	UserID           string     `json:"user_id" db:"user_id"`
	CategoryID       *string    `json:"category_id" db:"category_id"`
	Category         *string    `json:"category" db:"category"`
	CategoryName     *string    `json:"category_name" db:"category_name"`
	CategoryColor    *string    `json:"category_color" db:"category_color"`
	SubCategory      *string    `json:"sub_category" db:"sub_category"`
	SubCategoryAlias *string    `json:"subCategory" db:"sub_category_alias"`
	SupplierID       *string    `json:"supplier_id" db:"supplier_id"`
	BrandID          *string    `json:"brand_id" db:"brand_id"`
	Name             string     `json:"name" db:"name"`
	Description      *string    `json:"description" db:"description"`
	Price            float64    `json:"price" db:"price"`
	Cost             float64    `json:"cost" db:"cost"`
	CostPrice        float64    `json:"costPrice" db:"cost_price_alias"`
	Stock            int        `json:"stock" db:"stock"`
	MinStock         int        `json:"min_stock" db:"min_stock"`
	MinStockAlias    int        `json:"minStock" db:"min_stock_alias"`
	Unit             string     `json:"unit" db:"unit"`
	Barcode          *string    `json:"barcode" db:"barcode"`
	SKU              *string    `json:"sku" db:"sku"`
	Image            *string    `json:"image" db:"image"`
	Brand            *string    `json:"brand" db:"brand"`
	Supplier         *string    `json:"supplier" db:"supplier"`
	ProductType      string     `json:"product_type" db:"product_type"`
	ProductTypeAlias string     `json:"productType" db:"product_type_alias"`
	OwnershipType    string     `json:"ownership_type" db:"ownership_type"`
	OwnershipAlias   string     `json:"ownershipType" db:"ownership_type_alias"`
	IsActive         bool       `json:"is_active" db:"is_active"`
	IsActiveAlias    bool       `json:"isActive" db:"is_active_alias"`
	ShowOnline       bool       `json:"show_in_online_store" db:"show_in_online_store"`
	ShowOnlineAlias  bool       `json:"showInOnlineStore" db:"show_in_online_store_alias"`
	CreatedAt        *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        *time.Time `json:"updated_at" db:"updated_at"`
}

func (h *ProductsHandler) GetProducts(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	userRole := strings.ToLower(strings.TrimSpace(c.GetString("userRole")))
	isSuperAdmin := userRole == "super_admin" || userRole == "superadmin"

	query := `
		SELECT p.id, p.user_id, p.category_id, p.category, p.sub_category,
		       p.sub_category as sub_category_alias,
		       p.supplier_id, p.brand_id, p.name, p.description,
		       COALESCE(p.price, 0)::float8 as price,
		       COALESCE(p.cost, 0)::float8 as cost,
		       COALESCE(p.cost, 0)::float8 as cost_price_alias,
		       COALESCE(p.stock, 0) as stock,
		       COALESCE(p.min_stock, 0) as min_stock,
		       COALESCE(p.min_stock, 0) as min_stock_alias,
		       COALESCE(p.unit, 'pcs') as unit,
		       p.barcode, p.sku, p.image, p.brand, p.supplier,
		       COALESCE(p.product_type, 'physical') as product_type,
		       COALESCE(p.product_type, 'physical') as product_type_alias,
		       COALESCE(p.ownership_type, 'owned') as ownership_type,
		       COALESCE(p.ownership_type, 'owned') as ownership_type_alias,
		       COALESCE(p.is_active, true) as is_active,
		       COALESCE(p.is_active, true) as is_active_alias,
		       COALESCE(p.show_in_online_store, false) as show_in_online_store,
		       COALESCE(p.show_in_online_store, false) as show_in_online_store_alias,
		       c.name as category_name,
		       c.color as category_color,
		       COALESCE(p.created_at, CURRENT_TIMESTAMP) as created_at,
		       COALESCE(p.updated_at, CURRENT_TIMESTAMP) as updated_at
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE $1 = true OR p.user_id = $2 OR p.user_id = $3
		ORDER BY p.name ASC
	`

	var prods []ProductResponse
	err := database.DB.Select(&prods, query, isSuperAdmin, tenantID, userID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	if prods == nil {
		prods = []ProductResponse{}
	}
	c.JSON(http.StatusOK, prods)
}

func (h *ProductsHandler) GetProductByID(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	userRole := strings.ToLower(strings.TrimSpace(c.GetString("userRole")))
	isSuperAdmin := userRole == "super_admin" || userRole == "superadmin"
	id := c.Param("id")

	query := `
		SELECT p.id, p.user_id, p.category_id, p.category, p.sub_category,
		       p.sub_category as sub_category_alias,
		       p.supplier_id, p.brand_id, p.name, p.description,
		       COALESCE(p.price, 0)::float8 as price,
		       COALESCE(p.cost, 0)::float8 as cost,
		       COALESCE(p.cost, 0)::float8 as cost_price_alias,
		       COALESCE(p.stock, 0) as stock,
		       COALESCE(p.min_stock, 0) as min_stock,
		       COALESCE(p.min_stock, 0) as min_stock_alias,
		       COALESCE(p.unit, 'pcs') as unit,
		       p.barcode, p.sku, p.image, p.brand, p.supplier,
		       COALESCE(p.product_type, 'physical') as product_type,
		       COALESCE(p.product_type, 'physical') as product_type_alias,
		       COALESCE(p.ownership_type, 'owned') as ownership_type,
		       COALESCE(p.ownership_type, 'owned') as ownership_type_alias,
		       COALESCE(p.is_active, true) as is_active,
		       COALESCE(p.is_active, true) as is_active_alias,
		       COALESCE(p.show_in_online_store, false) as show_in_online_store,
		       COALESCE(p.show_in_online_store, false) as show_in_online_store_alias,
		       c.name as category_name,
		       c.color as category_color,
		       COALESCE(p.created_at, CURRENT_TIMESTAMP) as created_at,
		       COALESCE(p.updated_at, CURRENT_TIMESTAMP) as updated_at
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.id = $1 AND ($2 = true OR p.user_id = $3 OR p.user_id = $4)
	`

	var prod ProductResponse
	err := database.DB.Get(&prod, query, id, isSuperAdmin, tenantID, userID)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Product not found")
		return
	}

	c.JSON(http.StatusOK, prod)
}

func (h *ProductsHandler) CreateProduct(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Name              string   `json:"name"`
		Price             float64  `json:"price"`
		Cost              *float64 `json:"cost"`
		CostPrice         *float64 `json:"costPrice"`
		Stock             int      `json:"stock"`
		MinStock          *int     `json:"min_stock"`
		MinStockCamel     *int     `json:"minStock"`
		Unit              string   `json:"unit"`
		Barcode           string   `json:"barcode"`
		SKU               string   `json:"sku"`
		CategoryID        string   `json:"category_id"`
		Category          string   `json:"category"`
		SubCategory       string   `json:"sub_category"`
		SubCategoryCamel  string   `json:"subCategory"`
		Description       string   `json:"description"`
		SupplierID        string   `json:"supplier_id"`
		Supplier          string   `json:"supplier"`
		BrandID           string   `json:"brand_id"`
		Brand             string   `json:"brand"`
		ProductType       string   `json:"product_type"`
		ProductTypeCamel  string   `json:"productType"`
		OwnershipType     string   `json:"ownership_type"`
		OwnershipCamel    string   `json:"ownershipType"`
		Image             string   `json:"image"`
		IsActive          *bool    `json:"is_active"`
		IsActiveCamel     *bool    `json:"isActive"`
		ShowOnline        *bool    `json:"show_in_online_store"`
		ShowOnlineCamel   *bool    `json:"showInOnlineStore"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		utils.RespondValidationError(c, "Nama produk wajib diisi")
		return
	}

	if req.Price < 0 {
		utils.RespondValidationError(c, "Harga tidak boleh negatif")
		return
	}
	if req.Stock < 0 {
		utils.RespondValidationError(c, "Stok tidak boleh negatif")
		return
	}

	// Check product quota
	var maxProducts int
	_ = database.DB.Get(&maxProducts, "SELECT COALESCE(max_products, 100) FROM users WHERE id = $1", tenantID)
	if maxProducts <= 0 {
		maxProducts = 100
	}

	var currentCount int
	_ = database.DB.Get(&currentCount, "SELECT COUNT(*) FROM products WHERE user_id = $1", tenantID)
	if currentCount >= maxProducts {
		utils.RespondError(c, http.StatusForbidden, fmt.Sprintf("Batas kuota produk paket Anda terlampaui (Maksimum %d produk). Silakan hubungi admin untuk upgrade paket.", maxProducts))
		return
	}

	id := utils.GenerateUUID()

	cost := 0.0
	if req.CostPrice != nil {
		cost = *req.CostPrice
	} else if req.Cost != nil {
		cost = *req.Cost
	}

	minStock := 0
	if req.MinStockCamel != nil {
		minStock = *req.MinStockCamel
	} else if req.MinStock != nil {
		minStock = *req.MinStock
	}

	unit := req.Unit
	if unit == "" {
		unit = "pcs"
	}

	subCat := req.SubCategory
	if subCat == "" {
		subCat = req.SubCategoryCamel
	}

	prodType := req.ProductType
	if prodType == "" {
		prodType = req.ProductTypeCamel
	}
	if prodType == "" {
		prodType = "physical"
	}

	ownerType := req.OwnershipType
	if ownerType == "" {
		ownerType = req.OwnershipCamel
	}
	if ownerType == "" {
		ownerType = "owned"
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	} else if req.IsActiveCamel != nil {
		isActive = *req.IsActiveCamel
	}

	showOnline := false
	if req.ShowOnline != nil {
		showOnline = *req.ShowOnline
	} else if req.ShowOnlineCamel != nil {
		showOnline = *req.ShowOnlineCamel
	}

	// Resolve category ID
	catID := req.CategoryID
	if catID == "" && req.Category != "" {
		_ = database.DB.Get(&catID, "SELECT id FROM categories WHERE name = $1 AND user_id = $2 LIMIT 1", req.Category, tenantID)
	}

	// Resolve brand ID
	brandID := req.BrandID
	if brandID == "" && req.Brand != "" {
		_ = database.DB.Get(&brandID, "SELECT id FROM brands WHERE name = $1 AND user_id = $2 LIMIT 1", req.Brand, tenantID)
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO products (
			id, user_id, name, description, sku, barcode, category, category_id, sub_category,
			supplier_id, brand, brand_id, product_type, ownership_type,
			supplier, price, cost, stock, min_stock, unit, image,
			show_in_online_store, is_active
		) VALUES (
			$1, $2, $3, NULLIF($4, ''), $5, $6, $7, NULLIF($8, ''), NULLIF($9, ''),
			NULLIF($10, ''), $11, NULLIF($12, ''), $13, $14,
			$15, $16, $17, $18, $19, $20, $21,
			$22, $23
		)
	`, id, tenantID, req.Name, req.Description, req.SKU, req.Barcode, req.Category, catID, subCat,
		req.SupplierID, req.Brand, brandID, prodType, ownerType,
		req.Supplier, req.Price, cost, req.Stock, minStock, unit, req.Image,
		showOnline, isActive)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Record initial stock if stock > 0
	if req.Stock > 0 {
		_, _ = tx.Exec(`
			INSERT INTO stock_movements (id, user_id, product_id, type, quantity, stock_before, stock_after, reference_type, notes, created_by)
			VALUES ($1, $2, $3, 'in', $4, 0, $4, 'initial', 'Initial stock on product creation', $2)
		`, utils.GenerateUUID(), tenantID, id, req.Stock)
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.Params = []gin.Param{{Key: "id", Value: id}}
	h.GetProductByID(c)
}

func (h *ProductsHandler) UpdateProduct(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	userRole := strings.ToLower(strings.TrimSpace(c.GetString("userRole")))
	isSuperAdmin := userRole == "super_admin" || userRole == "superadmin"
	id := c.Param("id")

	var req struct {
		Name             string   `json:"name"`
		Description      *string  `json:"description"`
		Price            *float64 `json:"price"`
		Cost             *float64 `json:"cost"`
		CostPrice        *float64 `json:"costPrice"`
		Stock            *int     `json:"stock"`
		MinStock         *int     `json:"min_stock"`
		MinStockCamel    *int     `json:"minStock"`
		Unit             string   `json:"unit"`
		Barcode          string   `json:"barcode"`
		SKU              string   `json:"sku"`
		CategoryID       string   `json:"category_id"`
		Category         string   `json:"category"`
		SubCategory      string   `json:"sub_category"`
		SubCategoryCamel string   `json:"subCategory"`
		SupplierID       string   `json:"supplier_id"`
		Supplier         string   `json:"supplier"`
		BrandID          string   `json:"brand_id"`
		Brand            string   `json:"brand"`
		ProductType      string   `json:"product_type"`
		ProductTypeCamel string   `json:"productType"`
		OwnershipType    string   `json:"ownership_type"`
		OwnershipCamel   string   `json:"ownershipType"`
		Image            string   `json:"image"`
		IsActive         *bool    `json:"is_active"`
		IsActiveCamel    *bool    `json:"isActive"`
		ShowOnline       *bool    `json:"show_in_online_store"`
		ShowOnlineCamel  *bool    `json:"showInOnlineStore"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Data produk tidak valid")
		return
	}

	var oldProduct struct {
		Stock       int            `db:"stock"`
		UserID      string         `db:"user_id"`
		Description sql.NullString `db:"description"`
	}
	var err error
	if isSuperAdmin {
		err = database.DB.Get(&oldProduct, "SELECT COALESCE(stock, 0) as stock, user_id, description FROM products WHERE id = $1", id)
	} else {
		err = database.DB.Get(&oldProduct, `
			SELECT COALESCE(stock, 0) as stock, user_id, description 
			FROM products 
			WHERE id = $1 AND (user_id = $2 OR user_id = $3)
		`, id, tenantID, userID)
	}
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Product not found")
		return
	}

	cost := 0.0
	if req.CostPrice != nil {
		cost = *req.CostPrice
	} else if req.Cost != nil {
		cost = *req.Cost
	}

	minStock := 0
	if req.MinStockCamel != nil {
		minStock = *req.MinStockCamel
	} else if req.MinStock != nil {
		minStock = *req.MinStock
	}

	newStock := oldProduct.Stock
	if req.Stock != nil {
		newStock = *req.Stock
	}

	unit := req.Unit
	if unit == "" {
		unit = "pcs"
	}

	subCat := req.SubCategory
	if subCat == "" {
		subCat = req.SubCategoryCamel
	}

	prodType := req.ProductType
	if prodType == "" {
		prodType = req.ProductTypeCamel
	}
	if prodType == "" {
		prodType = "physical"
	}

	ownerType := req.OwnershipType
	if ownerType == "" {
		ownerType = req.OwnershipCamel
	}
	if ownerType == "" {
		ownerType = "owned"
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	} else if req.IsActiveCamel != nil {
		isActive = *req.IsActiveCamel
	}

	showOnline := false
	if req.ShowOnline != nil {
		showOnline = *req.ShowOnline
	} else if req.ShowOnlineCamel != nil {
		showOnline = *req.ShowOnlineCamel
	}

	price := 0.0
	if req.Price != nil {
		price = *req.Price
	}

	desc := ""
	if req.Description != nil {
		desc = *req.Description
	} else if oldProduct.Description.Valid {
		desc = oldProduct.Description.String
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		UPDATE products
		SET name = $1, description = NULLIF($2, ''), sku = $3, barcode = $4, category = $5, category_id = NULLIF($6, ''),
		    sub_category = NULLIF($7, ''), supplier_id = NULLIF($8, ''), brand = $9, brand_id = NULLIF($10, ''), product_type = $11,
		    ownership_type = $12, supplier = $13, price = $14, cost = $15, stock = $16,
		    min_stock = $17, unit = $18, image = $19, show_in_online_store = $20, is_active = $21,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $22
	`, req.Name, desc, req.SKU, req.Barcode, req.Category, req.CategoryID,
		subCat, req.SupplierID, req.Brand, req.BrandID, prodType, ownerType,
		req.Supplier, price, cost, newStock, minStock, unit, req.Image,
		showOnline, isActive, id)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Record stock adjustment if stock changed
	if oldProduct.Stock != newStock {
		qty := newStock - oldProduct.Stock
		if qty < 0 {
			qty = -qty
		}
		targetOwner := oldProduct.UserID
		if targetOwner == "" {
			targetOwner = tenantID
		}
		_, _ = tx.Exec(`
			INSERT INTO stock_movements (id, user_id, product_id, type, quantity, stock_before, stock_after, reference_type, notes, created_by)
			VALUES ($1, $2, $3, 'adjustment', $4, $5, $6, 'manual', $7, $8)
		`, utils.GenerateUUID(), targetOwner, id, qty, oldProduct.Stock, newStock, fmt.Sprintf("Stock adjusted from %d to %d", oldProduct.Stock, newStock), userID)
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Product updated successfully", gin.H{"success": true})
}

func (h *ProductsHandler) DeleteProduct(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	userRole := strings.ToLower(strings.TrimSpace(c.GetString("userRole")))
	isSuperAdmin := userRole == "super_admin" || userRole == "superadmin"
	id := c.Param("id")

	var image sql.NullString
	if isSuperAdmin {
		_ = database.DB.Get(&image, "SELECT image FROM products WHERE id = $1", id)
		_, _ = database.DB.Exec("DELETE FROM stock_movements WHERE product_id = $1", id)
		_, err := database.DB.Exec("DELETE FROM products WHERE id = $1", id)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, err.Error())
			return
		}
	} else {
		_ = database.DB.Get(&image, "SELECT image FROM products WHERE id = $1 AND (user_id = $2 OR user_id = $3)", id, tenantID, userID)
		_, _ = database.DB.Exec("DELETE FROM stock_movements WHERE product_id = $1", id)
		res, err := database.DB.Exec("DELETE FROM products WHERE id = $1 AND (user_id = $2 OR user_id = $3)", id, tenantID, userID)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, err.Error())
			return
		}
		rows, _ := res.RowsAffected()
		if rows == 0 {
			utils.RespondError(c, http.StatusNotFound, "Product not found")
			return
		}
	}

	if image.Valid && image.String != "" {
		filePath := filepath.Join(config.AppConfig.UploadsDir, filepath.Base(image.String))
		_ = os.Remove(filePath)
	}

	utils.RespondSuccess(c, "Product deleted successfully", gin.H{"success": true})
}

func getUploadDir() string {
	if config.AppConfig != nil && config.AppConfig.UploadsDir != "" {
		_ = os.MkdirAll(config.AppConfig.UploadsDir, 0777)
		return config.AppConfig.UploadsDir
	}
	for _, dir := range []string{
		"/www/wwwroot/pos.elvisyam.com/uploads",
		"/www/wwwroot/posh.web.id/uploads",
		"/www/wwwroot/tokoryo.web.id/uploads",
		"/www/wwwroot/pos-app/uploads",
	} {
		if fi, err := os.Stat(dir); err == nil && fi.IsDir() {
			return dir
		}
	}
	_ = os.MkdirAll("./uploads", 0777)
	return "./uploads"
}

func (h *ProductsHandler) UploadProductImageByID(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	userRole := strings.ToLower(strings.TrimSpace(c.GetString("userRole")))
	isSuperAdmin := userRole == "super_admin" || userRole == "superadmin"
	id := c.Param("id")

	file, err := c.FormFile("image")
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "No image file provided: "+err.Error())
		return
	}

	targetDir := getUploadDir()
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("product-%d%s", time.Now().UnixNano(), ext)
	dst := filepath.Join(targetDir, filename)

	if err := c.SaveUploadedFile(file, dst); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal menyimpan file gambar: "+err.Error())
		return
	}

	imageURL := fmt.Sprintf("/uploads/%s", filename)
	if isSuperAdmin {
		_, _ = database.DB.Exec("UPDATE products SET image = $1 WHERE id = $2", imageURL, id)
	} else {
		_, _ = database.DB.Exec("UPDATE products SET image = $1 WHERE id = $2 AND (user_id = $3 OR user_id = $4)", imageURL, id, tenantID, userID)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"imageUrl": imageURL,
	})
}

func (h *ProductsHandler) UploadProductImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "No image file provided: "+err.Error())
		return
	}

	targetDir := getUploadDir()
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("upload-%d%s", time.Now().UnixNano(), ext)
	dst := filepath.Join(targetDir, filename)

	if err := c.SaveUploadedFile(file, dst); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal menyimpan file gambar: "+err.Error())
		return
	}

	imageURL := fmt.Sprintf("/uploads/%s", filename)
	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"imageUrl": imageURL,
	})
}
