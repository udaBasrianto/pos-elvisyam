package store

import (
	"database/sql"
	"fmt"
	"html"
	"net/http"
	"strings"
	"sync"
	"time"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type StoreHandler struct{}

func NewStoreHandler() *StoreHandler {
	return &StoreHandler{}
}

func (h *StoreHandler) RegisterRoutes(r *gin.RouterGroup) {
	// Store customer auth
	storeAuth := r.Group("/store/auth")
	{
		storeAuth.POST("/register", h.RegisterCustomer)
		storeAuth.POST("/login", middleware.LoginRateLimit(), h.LoginCustomer)
		storeAuth.GET("/me", middleware.AuthenticateStoreCustomer(), h.GetCustomerMe)
		storeAuth.GET("/point-history", middleware.AuthenticateStoreCustomer(), h.GetCustomerPointHistory)
		storeAuth.PUT("/profile", middleware.AuthenticateStoreCustomer(), h.UpdateCustomerProfile)
		storeAuth.POST("/change-password", middleware.AuthenticateStoreCustomer(), h.ChangeCustomerPassword)
	}
	r.GET("/store/customer/point-history", middleware.AuthenticateStoreCustomer(), h.GetCustomerPointHistory)

	// Public storefront catalog
	r.GET("/store/info/:slug", h.GetStoreInfoBySlug)
	r.GET("/store/products", h.GetStoreProducts)
	r.GET("/store/products/:id", h.GetStoreProductByID)
	r.GET("/store/categories", h.GetStoreCategories)
	r.GET("/store/orders/track/:order_id", h.TrackOrder)
	r.GET("/store/og/:slug/product/:id", h.GetProductOpenGraphHTML)
	r.GET("/store/og/product/:id", h.GetProductOpenGraphHTML)

	// Cart session
	r.GET("/store/cart/:sessionId", h.GetCart)
	r.POST("/store/cart/:sessionId/add", h.AddToCart)
	r.PUT("/store/cart/:sessionId/update", h.UpdateCart)
	r.DELETE("/store/cart/:sessionId/remove/:productId", h.RemoveFromCart)
	r.DELETE("/store/cart/:sessionId", h.ClearCart)

	// Customer order actions
	r.GET("/store/orders", middleware.AuthenticateStoreCustomer(), h.GetCustomerOrders)
	r.POST("/store/checkout", middleware.AuthenticateStoreCustomer(), h.StoreCheckout)
	r.POST("/store/orders", h.CreateStoreOrderPublic)

	// Admin online orders management
	adminOrders := r.Group("/admin/online-orders", middleware.AuthenticateToken())
	{
		adminOrders.GET("", h.AdminGetOnlineOrders)
		adminOrders.GET("/pending-count", h.AdminGetPendingCount)
		adminOrders.GET("/:id", h.AdminGetOrderDetail)
		adminOrders.PUT("/:id/status", middleware.RequireRole("admin", "manager"), h.AdminUpdateOrderStatus)
	}
}

// In-memory cart store
type CartItem struct {
	ProductID   string  `json:"productId"`
	ProductName string  `json:"productName"`
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	Quantity    int     `json:"quantity"`
	Image       string  `json:"image"`
	MaxStock    int     `json:"maxStock"`
	Stock       int     `json:"stock"`
	Subtotal    float64 `json:"subtotal"`
}

var cartStore = struct {
	sync.RWMutex
	m map[string][]CartItem
}{m: make(map[string][]CartItem)}

func (h *StoreHandler) GetCart(c *gin.Context) {
	sessionID := c.Param("sessionId")
	cartStore.RLock()
	defer cartStore.RUnlock()

	items, exists := cartStore.m[sessionID]
	if !exists || items == nil {
		items = []CartItem{}
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"cart":    items,
	})
}

func (h *StoreHandler) AddToCart(c *gin.Context) {
	sessionID := c.Param("sessionId")
	var req struct {
		ProductID string `json:"productId"`
		Quantity  int    `json:"quantity"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.ProductID == "" {
		utils.RespondValidationError(c, "Product ID required")
		return
	}
	if req.Quantity <= 0 {
		req.Quantity = 1
	}

	var prod struct {
		ID    string         `db:"id"`
		Name  string         `db:"name"`
		Price float64        `db:"price"`
		Stock int            `db:"stock"`
		Image sql.NullString `db:"image"`
	}
	err := database.DB.Get(&prod, "SELECT id, name, price, stock, image FROM products WHERE id = $1 AND is_active = true", req.ProductID)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Produk tidak ditemukan atau tidak aktif")
		return
	}

	cartStore.Lock()
	defer cartStore.Unlock()

	items := cartStore.m[sessionID]
	found := false
	for i := range items {
		if items[i].ProductID == req.ProductID {
			items[i].Quantity += req.Quantity
			if items[i].Quantity > prod.Stock {
				items[i].Quantity = prod.Stock
			}
			items[i].Subtotal = items[i].Price * float64(items[i].Quantity)
			found = true
			break
		}
	}
	if !found {
		items = append(items, CartItem{
			ProductID:   prod.ID,
			ProductName: prod.Name,
			Name:        prod.Name,
			Price:       prod.Price,
			Quantity:    req.Quantity,
			Image:       prod.Image.String,
			MaxStock:    prod.Stock,
			Stock:       prod.Stock,
			Subtotal:    prod.Price * float64(req.Quantity),
		})
	}
	cartStore.m[sessionID] = items
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"cart":    items,
	})
}

func (h *StoreHandler) UpdateCart(c *gin.Context) {
	sessionID := c.Param("sessionId")
	var req struct {
		ProductID string `json:"productId"`
		Quantity  int    `json:"quantity"`
	}
	_ = c.ShouldBindJSON(&req)

	cartStore.Lock()
	defer cartStore.Unlock()

	items := cartStore.m[sessionID]
	for i := range items {
		if items[i].ProductID == req.ProductID {
			if req.Quantity <= 0 {
				items = append(items[:i], items[i+1:]...)
			} else {
				items[i].Quantity = req.Quantity
				items[i].Subtotal = items[i].Price * float64(items[i].Quantity)
			}
			break
		}
	}
	cartStore.m[sessionID] = items
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"cart":    items,
	})
}

func (h *StoreHandler) RemoveFromCart(c *gin.Context) {
	sessionID := c.Param("sessionId")
	productID := c.Param("productId")

	cartStore.Lock()
	defer cartStore.Unlock()

	items := cartStore.m[sessionID]
	for i := range items {
		if items[i].ProductID == productID {
			items = append(items[:i], items[i+1:]...)
			break
		}
	}
	cartStore.m[sessionID] = items
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"cart":    items,
	})
}

func (h *StoreHandler) ClearCart(c *gin.Context) {
	sessionID := c.Param("sessionId")
	cartStore.Lock()
	defer cartStore.Unlock()

	delete(cartStore.m, sessionID)
	utils.RespondSuccess(c, "Cart cleared", gin.H{"success": true})
}

// -------------------------------------------------------------
// STORE CUSTOMER AUTH
// -------------------------------------------------------------

type StoreCustomer struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Email     string    `json:"email" db:"email"`
	Password  string    `json:"-" db:"password"`
	Phone     *string   `json:"phone" db:"phone"`
	Address   *string   `json:"address" db:"address"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

func (h *StoreHandler) RegisterCustomer(c *gin.Context) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Phone    string `json:"phone"`
		Address  string `json:"address"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" || req.Email == "" || req.Password == "" {
		utils.RespondValidationError(c, "Nama, email, dan password wajib diisi")
		return
	}

	var existingID string
	err := database.DB.Get(&existingID, "SELECT id FROM store_customers WHERE email = $1", req.Email)
	if err == nil && existingID != "" {
		utils.RespondError(c, http.StatusBadRequest, "Email sudah terdaftar")
		return
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal memproses password")
		return
	}

	id := utils.GenerateUUID()
	_, err = database.DB.Exec(`
		INSERT INTO store_customers (id, name, email, password, phone, address, is_active)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), true)
	`, id, req.Name, req.Email, hashedPassword, req.Phone, req.Address)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	token, _ := utils.GenerateStoreCustomerJWT(id, req.Email, req.Name, "", config.AppConfig.JWTSecret)

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"customer": gin.H{
			"id":      id,
			"name":    req.Name,
			"email":   req.Email,
			"phone":   req.Phone,
			"address": req.Address,
		},
	})
}

func (h *StoreHandler) LoginCustomer(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Phone    string `json:"phone"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || (req.Email == "" && req.Phone == "") || req.Password == "" {
		utils.RespondValidationError(c, "Email/No HP dan password harus diisi")
		return
	}

	identifier := req.Email
	if identifier == "" {
		identifier = req.Phone
	}

	var cust StoreCustomer
	err := database.DB.Get(&cust, "SELECT id, name, email, password, phone, address, is_active, created_at FROM store_customers WHERE email = $1 OR phone = $1", identifier)
	if err != nil {
		utils.RespondError(c, http.StatusUnauthorized, "Email/No HP atau password salah")
		return
	}

	if !utils.CheckPasswordHash(req.Password, cust.Password) {
		utils.RespondError(c, http.StatusUnauthorized, "Email/No HP atau password salah")
		return
	}

	token, _ := utils.GenerateStoreCustomerJWT(cust.ID, cust.Email, cust.Name, "", config.AppConfig.JWTSecret)

	phone := ""
	if cust.Phone != nil {
		phone = *cust.Phone
	}
	address := ""
	if cust.Address != nil {
		address = *cust.Address
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"customer": gin.H{
			"id":      cust.ID,
			"name":    cust.Name,
			"email":   cust.Email,
			"phone":   phone,
			"address": address,
		},
	})
}

func (h *StoreHandler) GetCustomerMe(c *gin.Context) {
	custVal, _ := c.Get("customer")
	cust := custVal.(middleware.AuthCustomer)

	var sc StoreCustomer
	err := database.DB.Get(&sc, "SELECT id, name, email, phone, address, is_active, created_at FROM store_customers WHERE id = $1", cust.ID)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Customer not found")
		return
	}

	phone := ""
	if sc.Phone != nil {
		phone = *sc.Phone
	}
	address := ""
	if sc.Address != nil {
		address = *sc.Address
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         sc.ID,
		"name":       sc.Name,
		"email":      sc.Email,
		"phone":      phone,
		"address":    address,
		"created_at": sc.CreatedAt,
	})
}

func (h *StoreHandler) GetCustomerPointHistory(c *gin.Context) {
	custVal, _ := c.Get("customer")
	cust := custVal.(middleware.AuthCustomer)

	var sc StoreCustomer
	_ = database.DB.Get(&sc, "SELECT email, phone FROM store_customers WHERE id = $1", cust.ID)

	phone := ""
	if sc.Phone != nil {
		phone = *sc.Phone
	}

	var posCustID string
	_ = database.DB.Get(&posCustID, "SELECT id FROM customers WHERE (email = $1 AND email != '') OR (phone = $2 AND phone != '') LIMIT 1", sc.Email, phone)

	if posCustID == "" {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	type PointRec struct {
		ID        string    `json:"id" db:"id"`
		Type      string    `json:"type" db:"type"`
		Points    int       `json:"points" db:"points"`
		Amount    float64   `json:"amount" db:"amount"`
		Notes     string    `json:"notes" db:"notes"`
		CreatedAt time.Time `json:"created_at" db:"created_at"`
	}

	var history []PointRec
	_ = database.DB.Select(&history, "SELECT id, type, points, amount, COALESCE(notes, '') as notes, created_at FROM point_history WHERE customer_id = $1 ORDER BY created_at DESC", posCustID)
	if history == nil {
		history = []PointRec{}
	}
	c.JSON(http.StatusOK, history)
}

func (h *StoreHandler) UpdateCustomerProfile(c *gin.Context) {
	custVal, _ := c.Get("customer")
	cust := custVal.(middleware.AuthCustomer)

	var req struct {
		Name    string `json:"name"`
		Phone   string `json:"phone"`
		Address string `json:"address"`
	}
	_ = c.ShouldBindJSON(&req)

	_, err := database.DB.Exec(`
		UPDATE store_customers
		SET name = COALESCE(NULLIF($1, ''), name), phone = NULLIF($2, ''), address = NULLIF($3, ''), updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
	`, req.Name, req.Phone, req.Address, cust.ID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	h.GetCustomerMe(c)
}

func (h *StoreHandler) ChangeCustomerPassword(c *gin.Context) {
	custVal, _ := c.Get("customer")
	cust := custVal.(middleware.AuthCustomer)

	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.CurrentPassword == "" || req.NewPassword == "" {
		utils.RespondValidationError(c, "Password saat ini dan password baru wajib diisi")
		return
	}

	var currentHash string
	err := database.DB.Get(&currentHash, "SELECT password FROM store_customers WHERE id = $1", cust.ID)
	if err != nil || !utils.CheckPasswordHash(req.CurrentPassword, currentHash) {
		utils.RespondError(c, http.StatusBadRequest, "Password saat ini salah")
		return
	}

	newHash, _ := utils.HashPassword(req.NewPassword)
	_, _ = database.DB.Exec("UPDATE store_customers SET password = $1 WHERE id = $2", newHash, cust.ID)

	utils.RespondSuccess(c, "Password berhasil diubah", gin.H{"success": true})
}

// -------------------------------------------------------------
// PUBLIC STOREFRONT
// -------------------------------------------------------------

func (h *StoreHandler) GetStoreInfoBySlug(c *gin.Context) {
	rawParam := strings.TrimSpace(strings.ToLower(c.Param("slug")))
	rawParam = strings.TrimPrefix(rawParam, "https://")
	rawParam = strings.TrimPrefix(rawParam, "http://")
	rawParam = strings.TrimRight(rawParam, "/")
	if idx := strings.Index(rawParam, ":"); idx != -1 {
		rawParam = rawParam[:idx]
	}
	cleanWithoutWww := strings.TrimPrefix(rawParam, "www.")
	cleanWithWww := "www." + cleanWithoutWww

	host := strings.TrimSpace(strings.ToLower(c.Request.Host))
	if fHost := c.GetHeader("X-Forwarded-Host"); fHost != "" {
		host = strings.TrimSpace(strings.ToLower(fHost))
	}
	if idx := strings.Index(host, ":"); idx != -1 {
		host = host[:idx]
	}
	hostWithoutWww := strings.TrimPrefix(host, "www.")

	type StoreInfo struct {
		TenantID           string  `json:"tenant_id" db:"tenant_id"`
		FullName           *string `json:"full_name" db:"full_name"`
		ShopSlug           string  `json:"shop_slug" db:"shop_slug"`
		CustomDomain       *string `json:"custom_domain" db:"custom_domain"`
		BusinessName       *string `json:"business_name" db:"business_name"`
		OnlineStoreEnabled bool    `json:"online_store_enabled" db:"online_store_enabled"`
		LogoURL            *string `json:"logo_url" db:"logo_url"`
		BusinessLogo       *string `json:"business_logo" db:"business_logo"`
		Description        *string `json:"description" db:"description"`
		Tagline            *string `json:"tagline" db:"tagline"`
		ThemeColor         *string `json:"theme_color" db:"theme_color"`
		BusinessPhone      *string `json:"business_phone" db:"business_phone"`
		BusinessEmail      *string `json:"business_email" db:"business_email"`
		BusinessAddress    *string `json:"business_address" db:"business_address"`
		InstagramURL       *string `json:"instagram_url" db:"instagram_url"`
		FacebookURL        *string `json:"facebook_url" db:"facebook_url"`
		WhatsAppNumber     *string `json:"whatsapp_number" db:"whatsapp_number"`
		FooterText         *string `json:"footer_text" db:"footer_text"`
		StoreReviews       *string `json:"store_reviews" db:"store_reviews"`
		StoreFeatures      *string `json:"store_features" db:"store_features"`
		FaviconURL         *string `json:"favicon_url" db:"favicon_url"`
	}

	var info StoreInfo
	err := database.DB.Get(&info, `
		SELECT u.id as tenant_id, u.full_name, u.shop_slug, s.custom_domain,
		       s.business_name, COALESCE(s.online_store_enabled, true) as online_store_enabled,
		       s.logo_url, s.business_logo, s.description,
		       COALESCE(s.tagline, 'Sehat Alami, Hidup Harmoni') as tagline,
		       COALESCE(s.theme_color, 'emerald') as theme_color,
		       s.business_phone, s.business_email, s.business_address,
		       s.instagram_url, s.facebook_url, s.whatsapp_number, s.footer_text,
		       s.store_reviews, s.store_features, s.favicon_url
		FROM users u
		LEFT JOIN settings s ON u.id = s.user_id
		WHERE u.shop_slug = $1 
		   OR LOWER(s.custom_domain) = $1 
		   OR LOWER(s.custom_domain) = $2
		   OR LOWER(s.custom_domain) = $3
		   OR LOWER(s.custom_domain) = $4
		LIMIT 1
	`, rawParam, cleanWithoutWww, cleanWithWww, hostWithoutWww)

	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Toko tidak ditemukan")
		return
	}

	c.JSON(http.StatusOK, info)
}

func (h *StoreHandler) GetStoreProducts(c *gin.Context) {
	tenantID := c.Query("tenant_id")
	category := c.Query("category")
	subCategory := c.Query("sub_category")
	search := c.Query("search")

	if tenantID == "" {
		utils.RespondValidationError(c, "Tenant ID required")
		return
	}

	query := `
		SELECT p.id, p.user_id, p.name, p.description, p.price, p.stock, p.unit, p.image, p.category, p.category_id,
		       p.sub_category, p.brand,
		       c.name as category_name, c.color as category_color
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.user_id = $1 AND p.is_active = true AND p.show_in_online_store = true
	`
	args := []interface{}{tenantID}
	argIdx := 2

	if category != "" && category != "all" {
		query += fmt.Sprintf(" AND (p.category = $%d OR p.category_id = $%d)", argIdx, argIdx)
		args = append(args, category)
		argIdx++
	}
	if subCategory != "" && subCategory != "all" {
		query += fmt.Sprintf(" AND p.sub_category = $%d", argIdx)
		args = append(args, subCategory)
		argIdx++
	}
	if search != "" {
		query += fmt.Sprintf(" AND (p.name ILIKE $%d OR p.description ILIKE $%d OR p.sub_category ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	query += " ORDER BY p.name ASC"

	type StoreProd struct {
		ID            string  `json:"id" db:"id"`
		UserID        string  `json:"user_id" db:"user_id"`
		Name          string  `json:"name" db:"name"`
		Description   *string `json:"description" db:"description"`
		Price         float64 `json:"price" db:"price"`
		Stock         int     `json:"stock" db:"stock"`
		Unit          string  `json:"unit" db:"unit"`
		Image         *string `json:"image" db:"image"`
		Category      *string `json:"category" db:"category"`
		CategoryID    *string `json:"category_id" db:"category_id"`
		SubCategory   *string `json:"sub_category" db:"sub_category"`
		Brand         *string `json:"brand" db:"brand"`
		CategoryName  *string `json:"category_name" db:"category_name"`
		CategoryColor *string `json:"category_color" db:"category_color"`
	}

	var prods []StoreProd
	err := database.DB.Select(&prods, query, args...)
	if err != nil {
		c.JSON(http.StatusOK, []StoreProd{})
		return
	}
	if prods == nil {
		prods = []StoreProd{}
	}
	c.JSON(http.StatusOK, prods)
}

func (h *StoreHandler) GetStoreProductByID(c *gin.Context) {
	identifier := c.Param("id")

	type StoreProd struct {
		ID            string  `json:"id" db:"id"`
		UserID        string  `json:"user_id" db:"user_id"`
		Name          string  `json:"name" db:"name"`
		Description   *string `json:"description" db:"description"`
		Price         float64 `json:"price" db:"price"`
		Stock         int     `json:"stock" db:"stock"`
		Unit          string  `json:"unit" db:"unit"`
		Image         *string `json:"image" db:"image"`
		Category      *string `json:"category" db:"category"`
		SubCategory   *string `json:"sub_category" db:"sub_category"`
		Brand         *string `json:"brand" db:"brand"`
		CategoryName  *string `json:"category_name" db:"category_name"`
		CategoryColor *string `json:"category_color" db:"category_color"`
		Barcode       *string `json:"barcode" db:"barcode"`
		SKU           *string `json:"sku" db:"sku"`
	}

	var prod StoreProd
	err := database.DB.Get(&prod, `
		SELECT p.id, p.user_id, p.name, p.description, p.price, p.stock, p.unit, p.image, p.category,
		       p.sub_category, p.brand,
		       p.barcode, p.sku,
		       c.name as category_name, c.color as category_color
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.is_active = true 
		  AND (
		    p.id = $1 
		    OR (p.barcode IS NOT NULL AND p.barcode = $1)
		    OR (p.sku IS NOT NULL AND p.sku = $1)
		    OR LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(p.name, '[^a-zA-Z0-9]+', '-', 'g'))) = LOWER($1)
		    OR LOWER(p.name) = LOWER(REPLACE($1, '-', ' '))
		    OR LOWER(p.name) ILIKE LOWER(REPLACE($1, '-', ' '))
		  )
		ORDER BY (p.id = $1) DESC
		LIMIT 1
	`, identifier)

	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Produk tidak ditemukan")
		return
	}
	c.JSON(http.StatusOK, prod)
}

func (h *StoreHandler) GetStoreCategories(c *gin.Context) {
	tenantID := c.Query("tenant_id")
	if tenantID == "" {
		utils.RespondValidationError(c, "Tenant ID required")
		return
	}

	type CatRow struct {
		ID          string  `json:"id" db:"id"`
		Name        string  `json:"name" db:"name"`
		Description *string `json:"description" db:"description"`
		Color       *string `json:"color" db:"color"`
	}

	var list []CatRow
	err := database.DB.Select(&list, "SELECT id, name, description, color FROM categories WHERE user_id = $1 ORDER BY name ASC", tenantID)
	if err != nil {
		c.JSON(http.StatusOK, []CatRow{})
		return
	}
	if list == nil {
		list = []CatRow{}
	}
	c.JSON(http.StatusOK, list)
}

// -------------------------------------------------------------
// ORDERS & CHECKOUT
// -------------------------------------------------------------

type StoreOrderItemReq struct {
	ProductID   string  `json:"product_id"`
	ProductID2  string  `json:"productId"`
	ProductName string  `json:"product_name"`
	Quantity    int     `json:"quantity"`
	Price       float64 `json:"price"`
	UnitPrice   float64 `json:"unit_price"`
	Subtotal    float64 `json:"subtotal"`
}

type StoreOrderResp struct {
	ID              string               `json:"id" db:"id"`
	TenantID        string               `json:"tenant_id" db:"tenant_id"`
	StoreCustomerID *string              `json:"store_customer_id" db:"store_customer_id"`
	CustomerName    string               `json:"customer_name" db:"customer_name"`
	CustomerEmail   *string              `json:"customer_email" db:"customer_email"`
	CustomerPhone   *string              `json:"customer_phone" db:"customer_phone"`
	DeliveryAddress *string              `json:"delivery_address" db:"delivery_address"`
	TotalAmount     float64              `json:"total_amount" db:"total_amount"`
	PaymentMethod   string               `json:"payment_method" db:"payment_method"`
	Status          string               `json:"status" db:"status"`
	Notes           *string              `json:"notes" db:"notes"`
	CreatedAt       time.Time            `json:"created_at" db:"created_at"`
	Items           []StoreOrderItemResp `json:"items,omitempty"`
}

type StoreOrderItemResp struct {
	ID          string  `json:"id" db:"id"`
	OrderID     string  `json:"order_id" db:"order_id"`
	ProductID   string  `json:"product_id" db:"product_id"`
	ProductName string  `json:"product_name" db:"product_name"`
	Quantity    int     `json:"quantity" db:"quantity"`
	UnitPrice   float64 `json:"price" db:"unit_price"`
	Subtotal    float64 `json:"subtotal" db:"subtotal"`
}

func (h *StoreHandler) GetCustomerOrders(c *gin.Context) {
	custVal, _ := c.Get("customer")
	cust := custVal.(middleware.AuthCustomer)

	var orders []StoreOrderResp
	err := database.DB.Select(&orders, `
		SELECT id, tenant_id, store_customer_id, customer_name, customer_email, customer_phone,
		       delivery_address, total_amount, payment_method, status, notes, created_at
		FROM store_orders
		WHERE store_customer_id = $1 OR customer_email = $2
		ORDER BY created_at DESC
	`, cust.ID, cust.Email)

	if err != nil {
		c.JSON(http.StatusOK, []StoreOrderResp{})
		return
	}
	if orders == nil {
		orders = []StoreOrderResp{}
	}

	for i := range orders {
		var items []StoreOrderItemResp
		_ = database.DB.Select(&items, "SELECT id, order_id, product_id, product_name, quantity, unit_price, subtotal FROM store_order_items WHERE order_id = $1", orders[i].ID)
		if items == nil {
			items = []StoreOrderItemResp{}
		}
		orders[i].Items = items
	}

	c.JSON(http.StatusOK, orders)
}

func (h *StoreHandler) StoreCheckout(c *gin.Context) {
	custVal, _ := c.Get("customer")
	cust := custVal.(middleware.AuthCustomer)

	var req struct {
		TenantID        string              `json:"tenant_id"`
		Items           []StoreOrderItemReq `json:"items"`
		TotalAmount     float64             `json:"totalAmount"`
		PaymentMethod   string              `json:"payment_method"`
		DeliveryAddress string              `json:"delivery_address"`
		Notes           string              `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || len(req.Items) == 0 {
		utils.RespondValidationError(c, "Keranjang belanja kosong")
		return
	}

	var sc StoreCustomer
	_ = database.DB.Get(&sc, "SELECT name, email, phone, address FROM store_customers WHERE id = $1", cust.ID)

	phone := ""
	if sc.Phone != nil {
		phone = *sc.Phone
	}
	address := req.DeliveryAddress
	if address == "" && sc.Address != nil {
		address = *sc.Address
	}

	// Resolve tenant ID from first item's product
	tenantID := req.TenantID
	if tenantID == "" && len(req.Items) > 0 {
		firstPID := req.Items[0].ProductID
		if firstPID == "" {
			firstPID = req.Items[0].ProductID2
		}
		_ = database.DB.Get(&tenantID, "SELECT user_id FROM products WHERE id = $1", firstPID)
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	orderID := utils.GenerateUUID()
	payMethod := req.PaymentMethod
	if payMethod == "" {
		payMethod = "cash"
	}

	_, err = tx.Exec(`
		INSERT INTO store_orders (
			id, tenant_id, store_customer_id, customer_name, customer_email, customer_phone,
			delivery_address, total_amount, payment_method, status, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10
		)
	`, orderID, tenantID, cust.ID, sc.Name, sc.Email, phone, address, req.TotalAmount, payMethod, req.Notes)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	for _, it := range req.Items {
		pid := it.ProductID
		if pid == "" {
			pid = it.ProductID2
		}
		subtotal := it.Subtotal
		if subtotal <= 0 {
			subtotal = it.Price * float64(it.Quantity)
		}
		unitPrice := it.Price
		if unitPrice <= 0 {
			unitPrice = it.UnitPrice
		}

		_, _ = tx.Exec(`
			INSERT INTO store_order_items (id, order_id, product_id, product_name, quantity, unit_price, subtotal)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, utils.GenerateUUID(), orderID, pid, it.ProductName, it.Quantity, unitPrice, subtotal)
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"order_id": orderID,
		"message":  "Pesanan berhasil dibuat",
	})
}

func (h *StoreHandler) CreateStoreOrderPublic(c *gin.Context) {
	var req struct {
		TenantID        string              `json:"tenant_id"`
		CustomerName    string              `json:"customer_name"`
		CustomerEmail   string              `json:"customer_email"`
		CustomerPhone   string              `json:"customer_phone"`
		DeliveryAddress string              `json:"delivery_address"`
		TotalAmount     float64             `json:"total_amount"`
		PaymentMethod   string              `json:"payment_method"`
		Notes           string              `json:"notes"`
		Items           []StoreOrderItemReq `json:"items"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || len(req.Items) == 0 || req.CustomerName == "" {
		utils.RespondValidationError(c, "Nama pelanggan dan item pesanan wajib diisi")
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	orderID := utils.GenerateUUID()
	payMethod := req.PaymentMethod
	if payMethod == "" {
		payMethod = "cash"
	}

	_, err = tx.Exec(`
		INSERT INTO store_orders (
			id, tenant_id, customer_name, customer_email, customer_phone,
			delivery_address, total_amount, payment_method, status, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9
		)
	`, orderID, req.TenantID, req.CustomerName, req.CustomerEmail, req.CustomerPhone, req.DeliveryAddress, req.TotalAmount, payMethod, req.Notes)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	for _, it := range req.Items {
		pid := it.ProductID
		if pid == "" {
			pid = it.ProductID2
		}
		subtotal := it.Subtotal
		if subtotal <= 0 {
			subtotal = it.Price * float64(it.Quantity)
		}

		_, _ = tx.Exec(`
			INSERT INTO store_order_items (id, order_id, product_id, product_name, quantity, unit_price, subtotal)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, utils.GenerateUUID(), orderID, pid, it.ProductName, it.Quantity, it.Price, subtotal)
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"order_id": orderID,
	})
}

func (h *StoreHandler) TrackOrder(c *gin.Context) {
	orderID := c.Param("order_id")

	var order StoreOrderResp
	err := database.DB.Get(&order, "SELECT * FROM store_orders WHERE id = $1", orderID)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Pesanan tidak ditemukan")
		return
	}

	var items []StoreOrderItemResp
	_ = database.DB.Select(&items, "SELECT id, order_id, product_id, product_name, quantity, unit_price, subtotal FROM store_order_items WHERE order_id = $1", orderID)
	if items == nil {
		items = []StoreOrderItemResp{}
	}
	order.Items = items

	c.JSON(http.StatusOK, order)
}

// -------------------------------------------------------------
// ADMIN ONLINE ORDERS
// -------------------------------------------------------------

func (h *StoreHandler) AdminGetOnlineOrders(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	status := c.Query("status")

	query := `
		SELECT o.id, o.tenant_id, o.customer_name, o.customer_email, o.customer_phone,
		       o.delivery_address, o.total_amount, o.payment_method, o.status, o.notes, o.created_at,
		       COUNT(oi.id) as item_count,
		       STRING_AGG(oi.product_name, ', ') as products
		FROM store_orders o
		INNER JOIN store_order_items oi ON o.id = oi.order_id
		INNER JOIN products p ON oi.product_id = p.id
		WHERE p.user_id = $1
	`
	args := []interface{}{tenantID}

	if status != "" && status != "all" {
		query += " AND o.status = $2"
		args = append(args, status)
	}

	query += " GROUP BY o.id ORDER BY o.created_at DESC"

	type AdminOrderRow struct {
		ID              string    `json:"id" db:"id"`
		TenantID        string    `json:"tenant_id" db:"tenant_id"`
		CustomerName    string    `json:"customer_name" db:"customer_name"`
		CustomerEmail   *string   `json:"customer_email" db:"customer_email"`
		CustomerPhone   *string   `json:"customer_phone" db:"customer_phone"`
		DeliveryAddress *string   `json:"delivery_address" db:"delivery_address"`
		TotalAmount     float64   `json:"total_amount" db:"total_amount"`
		PaymentMethod   string    `json:"payment_method" db:"payment_method"`
		Status          string    `json:"status" db:"status"`
		Notes           *string   `json:"notes" db:"notes"`
		CreatedAt       time.Time `json:"created_at" db:"created_at"`
		ItemCount       int       `json:"item_count" db:"item_count"`
		Products        *string   `json:"products" db:"products"`
	}

	var list []AdminOrderRow
	err := database.DB.Select(&list, query, args...)
	if err != nil {
		c.JSON(http.StatusOK, []AdminOrderRow{})
		return
	}
	if list == nil {
		list = []AdminOrderRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *StoreHandler) AdminGetPendingCount(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var count int
	_ = database.DB.Get(&count, `
		SELECT COUNT(DISTINCT o.id)
		FROM store_orders o
		INNER JOIN store_order_items oi ON o.id = oi.order_id
		INNER JOIN products p ON oi.product_id = p.id
		WHERE o.status = 'pending' AND p.user_id = $1
	`, tenantID)

	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (h *StoreHandler) AdminGetOrderDetail(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var order StoreOrderResp
	err := database.DB.Get(&order, `
		SELECT DISTINCT o.* FROM store_orders o
		INNER JOIN store_order_items oi ON o.id = oi.order_id
		INNER JOIN products p ON oi.product_id = p.id
		WHERE o.id = $1 AND p.user_id = $2
	`, id, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Order not found")
		return
	}

	var items []StoreOrderItemResp
	_ = database.DB.Select(&items, "SELECT id, order_id, product_id, product_name, quantity, unit_price, subtotal FROM store_order_items WHERE order_id = $1", id)
	if items == nil {
		items = []StoreOrderItemResp{}
	}
	order.Items = items

	c.JSON(http.StatusOK, order)
}

func (h *StoreHandler) AdminUpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Status == "" {
		utils.RespondValidationError(c, "Status wajib diisi")
		return
	}

	_, err := database.DB.Exec("UPDATE store_orders SET status = $1 WHERE id = $2", req.Status, id)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Status pesanan berhasil diperbarui", gin.H{"success": true})
}

func (h *StoreHandler) GetProductOpenGraphHTML(c *gin.Context) {
	slug := c.Param("slug")
	productID := c.Param("id")

	// 1. Fetch Product
	type ProdData struct {
		ID          string  `db:"id"`
		UserID      string  `db:"user_id"`
		Name        string  `db:"name"`
		Description *string `db:"description"`
		Price       float64 `db:"price"`
		Image       *string `db:"image"`
		Category    *string `db:"category_name"`
		Stock       int     `db:"stock"`
	}

	var prod ProdData
	err := database.DB.Get(&prod, `
		SELECT p.id, p.user_id, p.name, p.description, p.price, p.image, p.stock,
		       c.name as category_name
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.is_active = true AND (
			p.id = $1 OR 
			(p.sku IS NOT NULL AND p.sku = $1) OR 
			(p.barcode IS NOT NULL AND p.barcode = $1)
		)
		LIMIT 1
	`, productID)

	if err != nil {
		c.String(http.StatusNotFound, "Produk tidak ditemukan")
		return
	}

	// 2. Fetch Store / Tenant Info
	type TenantData struct {
		ShopSlug     *string `db:"shop_slug"`
		BusinessName *string `db:"business_name"`
		Description  *string `db:"description"`
		LogoURL      *string `db:"logo_url"`
		CustomDomain *string `db:"custom_domain"`
		FaviconURL   *string `db:"favicon_url"`
	}

	var tenant TenantData
	_ = database.DB.Get(&tenant, `
		SELECT u.shop_slug, s.business_name, s.description, s.logo_url, s.custom_domain, s.favicon_url
		FROM users u
		LEFT JOIN settings s ON u.id = s.user_id
		WHERE u.id = $1
		LIMIT 1
	`, prod.UserID)

	storeName := "Toko Online"
	if tenant.BusinessName != nil && *tenant.BusinessName != "" {
		storeName = *tenant.BusinessName
	}

	shopSlug := ""
	if slug != "" {
		shopSlug = slug
	} else if tenant.ShopSlug != nil {
		shopSlug = *tenant.ShopSlug
	}

	formattedPrice := fmt.Sprintf("%.0f", prod.Price)
	desc := fmt.Sprintf("Beli %s di %s dengan harga Rp %s. Produk original, kualitas terjamin dan pengiriman cepat.", 
		prod.Name, 
		storeName, 
		formattedPrice,
	)
	if prod.Description != nil && *prod.Description != "" {
		desc = *prod.Description
		if len(desc) > 220 {
			desc = desc[:217] + "..."
		}
	}

	proto := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		proto = "https"
	}

	imageURL := ""
	if prod.Image != nil && *prod.Image != "" {
		imageURL = *prod.Image
		if !strings.HasPrefix(imageURL, "http") {
			imageURL = fmt.Sprintf("%s://%s%s", proto, c.Request.Host, imageURL)
		}
	} else if tenant.LogoURL != nil && *tenant.LogoURL != "" {
		imageURL = *tenant.LogoURL
		if !strings.HasPrefix(imageURL, "http") {
			imageURL = fmt.Sprintf("%s://%s%s", proto, c.Request.Host, imageURL)
		}
	}

	faviconURL := "/logo.svg"
	if tenant.FaviconURL != nil && *tenant.FaviconURL != "" {
		faviconURL = *tenant.FaviconURL
		if !strings.HasPrefix(faviconURL, "http") {
			faviconURL = fmt.Sprintf("%s://%s%s", proto, c.Request.Host, faviconURL)
		}
	} else if tenant.LogoURL != nil && *tenant.LogoURL != "" {
		faviconURL = imageURL
	}

	canonicalURL := fmt.Sprintf("%s://%s/%s/product/%s", proto, c.Request.Host, shopSlug, prod.ID)
	if shopSlug == "" {
		canonicalURL = fmt.Sprintf("%s://%s/product/%s", proto, c.Request.Host, prod.ID)
	}

	title := fmt.Sprintf("%s - Rp %s | %s", prod.Name, formattedPrice, storeName)

	availability := "https://schema.org/InStock"
	if prod.Stock <= 0 {
		availability = "https://schema.org/OutOfStock"
	}

	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>%s</title>
    <meta name="description" content="%s">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="%s">

    <!-- Open Graph / WhatsApp / Facebook / Telegram / LinkedIn / Discord -->
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="%s">
    <meta property="og:title" content="%s">
    <meta property="og:description" content="%s">
    <meta property="og:image" content="%s">
    <meta property="og:image:secure_url" content="%s">
    <meta property="og:url" content="%s">
    <meta property="og:price:amount" content="%s">
    <meta property="og:price:currency" content="IDR">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="%s">
    <meta name="twitter:description" content="%s">
    <meta name="twitter:image" content="%s">

    <!-- Google Search Structured Data (JSON-LD) -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": %q,
      "image": %q,
      "description": %q,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "IDR",
        "price": %q,
        "availability": %q,
        "url": %q
      }
    }
    </script>

    <!-- Client-side Redirect for human visitors -->
    <meta http-equiv="refresh" content="0;url=%s">
    <script>window.location.href = %q;</script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #334155;">
    <div style="text-align: center; padding: 24px; max-width: 400px;">
        <h2 style="margin-bottom: 8px;">%s</h2>
        <p style="color: #64748b; font-size: 14px;">Mengarahkan ke halaman produk...</p>
        <a href="%s" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #059669; color: white; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 14px;">Buka Halaman Produk</a>
    </div>
</body>
</html>`,
		html.EscapeString(title),
		html.EscapeString(desc),
		html.EscapeString(faviconURL),
		html.EscapeString(storeName),
		html.EscapeString(title),
		html.EscapeString(desc),
		html.EscapeString(imageURL),
		html.EscapeString(imageURL),
		html.EscapeString(canonicalURL),
		formattedPrice,
		html.EscapeString(title),
		html.EscapeString(desc),
		html.EscapeString(imageURL),
		prod.Name,
		imageURL,
		desc,
		formattedPrice,
		availability,
		canonicalURL,
		canonicalURL,
		canonicalURL,
		html.EscapeString(prod.Name),
		canonicalURL,
	)

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, htmlContent)
}

