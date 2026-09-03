package admin

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
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

type AdminHandler struct{}

func NewAdminHandler() *AdminHandler {
	return &AdminHandler{}
}

func (h *AdminHandler) RegisterRoutes(r *gin.RouterGroup) {
	// Settings
	r.GET("/settings", middleware.AuthenticateToken(), h.GetSettings)
	r.PUT("/settings", middleware.AuthenticateToken(), h.UpdateSettings)
	r.POST("/settings/verify-domain", middleware.AuthenticateToken(), h.VerifyCustomDomain)

	// Landing CMS
	r.GET("/landing-cms", h.GetLandingCMS)
	r.PUT("/landing-cms", middleware.AuthenticateToken(), middleware.RequireRole("super_admin"), h.UpdateLandingCMS)

	// Audit logs accessible by admin & super_admin
	r.GET("/admin/audit-logs", middleware.AuthenticateToken(), middleware.RequireRole("admin", "super_admin"), h.GetAuditLogs)

	// Super Admin Settings & SaaS Management
	sa := r.Group("/admin", middleware.AuthenticateToken(), middleware.RequireRole("super_admin"))
	{
		sa.GET("/landing-cms", h.GetLandingCMS)
		sa.PUT("/landing-cms", h.UpdateLandingCMS)
		sa.GET("/smtp-settings", h.GetSMTPSettings)
		sa.PUT("/smtp-settings", h.UpdateSMTPSettings)
		sa.POST("/smtp-settings/test", h.TestSMTPSettings)
		sa.GET("/ai-settings", h.GetAISettings)
		sa.PUT("/ai-settings", h.UpdateAISettings)
		sa.GET("/openrouter/models", h.FetchOpenRouterModels)
		sa.GET("/global-stats", h.GetGlobalStats)
		sa.GET("/global-analytics", h.GetGlobalAnalytics)
		sa.GET("/all-transactions", h.GetAllTransactions)
		sa.GET("/announcements", h.GetAdminAnnouncements)
		sa.POST("/announcements", h.CreateAdminAnnouncement)
		sa.PUT("/announcements/:id/toggle", h.ToggleAnnouncement)
		sa.DELETE("/announcements/:id", h.DeleteAdminAnnouncement)

		// Tenant Management
		sa.GET("/tenants/list", h.GetTenantsList)
		sa.GET("/tenants/summaries", h.GetTenantsSummaries)
		sa.GET("/tenants/:id/stats", h.GetTenantStats)
		sa.GET("/tenants/:id/products", h.GetTenantProducts)
		sa.GET("/tenants/:id/daily-sales", h.GetTenantDailySales)
		sa.POST("/tenants", h.CreateTenant)
		sa.PUT("/tenants/:id", h.UpdateTenant)
		sa.DELETE("/tenants/:id", h.DeleteTenant)
		sa.PUT("/tenants/:id/subscription", h.UpdateTenantSubscription)
		sa.POST("/tenants/:id/impersonate", h.ImpersonateTenant)
	}

	// Active announcements (all authenticated users)
	r.GET("/announcements/active", middleware.AuthenticateToken(), h.GetActiveAnnouncements)

	// Discussions / Support Tickets
	disc := r.Group("/discussions", middleware.AuthenticateToken())
	{
		disc.GET("", h.GetDiscussions)
		disc.GET("/:id", h.GetDiscussionDetail)
		disc.POST("", h.CreateDiscussion)
		disc.POST("/:id/replies", h.ReplyDiscussion)
		disc.PUT("/:id/status", h.UpdateDiscussionStatus)
	}

	// Users & Roles Management (Admin only)
	users := r.Group("/users", middleware.AuthenticateToken(), middleware.RequireRole("admin"))
	{
		users.GET("", h.GetUsers)
		users.GET("/:id", h.GetUserByID)
		users.POST("", h.CreateUser)
		users.PUT("/:id", h.UpdateUser)
		users.DELETE("/:id", h.DeleteUser)
		users.POST("/:id/reset-password", h.ResetUserPassword)
	}

	r.GET("/roles", middleware.AuthenticateToken(), h.GetRoles)
	r.GET("/permissions", middleware.AuthenticateToken(), h.GetPermissions)

	// Backup / Reset
	r.POST("/backup/reset", middleware.AuthenticateToken(), middleware.RequireRole("admin"), h.ResetData)
	r.GET("/demo/credentials", h.GetDemoCredentials)
}

// -------------------------------------------------------------
// SETTINGS
// -------------------------------------------------------------

type SettingsRow struct {
	ID                    string   `json:"id" db:"id"`
	UserID                string   `json:"user_id" db:"user_id"`
	BusinessName          string   `json:"business_name" db:"business_name"`
	BusinessAddress       *string  `json:"business_address" db:"business_address"`
	BusinessPhone         *string  `json:"business_phone" db:"business_phone"`
	BusinessEmail         *string  `json:"business_email" db:"business_email"`
	BusinessLogo          *string  `json:"business_logo" db:"business_logo"`
	LogoURL               *string  `json:"logo_url" db:"logo_url"`
	Description           *string  `json:"description" db:"description"`
	TaxRate               float64  `json:"tax_rate" db:"tax_rate"`
	DefaultDiscount       float64  `json:"default_discount" db:"default_discount"`
	Currency              string   `json:"currency" db:"currency"`
	ReceiptTemplate       string   `json:"receipt_template" db:"receipt_template"`
	ReceiptFooter         *string  `json:"receipt_footer" db:"receipt_footer"`
	PrintReceipt          bool     `json:"print_receipt" db:"print_receipt"`
	LowStockNotification bool     `json:"low_stock_notification" db:"low_stock_notification"`
	AutoBackup            bool     `json:"auto_backup" db:"auto_backup"`
	OnlineStoreEnabled    bool     `json:"online_store_enabled" db:"online_store_enabled"`
	ServiceQueueEnabled   bool     `json:"service_queue_enabled" db:"service_queue_enabled"`
	WorkshopEnabled       bool     `json:"workshop_enabled" db:"workshop_enabled"`
	BarbershopEnabled     bool     `json:"barbershop_enabled" db:"barbershop_enabled"`
	FnbEnabled            bool     `json:"fnb_enabled" db:"fnb_enabled"`
	LaundryEnabled        bool     `json:"laundry_enabled" db:"laundry_enabled"`
	FnbServiceChargePct   float64  `json:"fnb_service_charge_percent" db:"fnb_service_charge_percent"`
	ServiceStations       *string  `json:"service_stations" db:"service_stations"`
	QueuePrefix           *string  `json:"queue_prefix" db:"queue_prefix"`
	LaundryPerfumeOptions *string  `json:"laundry_perfume_options" db:"laundry_perfume_options"`
	LaundryRackLocations  *string  `json:"laundry_rack_locations" db:"laundry_rack_locations"`
	LaundryPrefix         *string  `json:"laundry_prefix" db:"laundry_prefix"`
	MinSpendForMember     float64  `json:"min_spend_for_member" db:"min_spend_for_member"`
	PointRate             float64  `json:"point_rate" db:"point_rate"`
	PointValue            float64  `json:"point_value" db:"point_value"`
	GoldThreshold         float64  `json:"gold_threshold" db:"gold_threshold"`
	PlatinumThreshold     float64  `json:"platinum_threshold" db:"platinum_threshold"`
	AuthBackground        *string  `json:"auth_background" db:"auth_background"`
	ThemeColor            *string  `json:"theme_color" db:"theme_color"`
	Tagline               *string  `json:"tagline" db:"tagline"`
	InstagramURL          *string  `json:"instagram_url" db:"instagram_url"`
	FacebookURL           *string  `json:"facebook_url" db:"facebook_url"`
	WhatsAppNumber        *string  `json:"whatsapp_number" db:"whatsapp_number"`
	FooterText            *string  `json:"footer_text" db:"footer_text"`
	StoreReviews          *string  `json:"store_reviews" db:"store_reviews"`
	StoreFeatures         *string  `json:"store_features" db:"store_features"`
	CustomDomain          *string  `json:"custom_domain" db:"custom_domain"`
	FaviconURL            *string  `json:"favicon_url" db:"favicon_url"`
	BarcodeSettings       *string  `json:"barcode_settings" db:"barcode_settings"`
}

func (h *AdminHandler) GetSettings(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var s SettingsRow
	err := database.DB.Get(&s, `
		SELECT id, user_id, COALESCE(business_name, 'Toko Saya') as business_name,
		       business_address, business_phone, business_email, business_logo, logo_url, description,
		       COALESCE(tax_rate, 0) as tax_rate, COALESCE(default_discount, 0) as default_discount,
		       COALESCE(currency, 'IDR') as currency, COALESCE(receipt_template, 'default') as receipt_template,
		       receipt_footer, COALESCE(print_receipt, true) as print_receipt,
		       COALESCE(low_stock_notification, true) as low_stock_notification,
		       COALESCE(auto_backup, false) as auto_backup,
		       COALESCE(online_store_enabled, true) as online_store_enabled,
		       COALESCE(service_queue_enabled, false) as service_queue_enabled,
		       COALESCE(workshop_enabled, false) as workshop_enabled,
		       COALESCE(barbershop_enabled, false) as barbershop_enabled,
		       COALESCE(fnb_enabled, false) as fnb_enabled,
		       COALESCE(laundry_enabled, false) as laundry_enabled,
		       COALESCE(fnb_service_charge_percent, 0) as fnb_service_charge_percent,
		       COALESCE(service_stations, 'Pit 1,Pit 2,Pit 3,Kursi 1,Kursi 2') as service_stations,
		       COALESCE(queue_prefix, 'A') as queue_prefix,
		       COALESCE(laundry_perfume_options, 'Akasia,Downy Red,Sakura,Ocean Fresh,Lavender,Snappy,Molto Blue') as laundry_perfume_options,
		       COALESCE(laundry_rack_locations, 'Rak A-01,Rak A-02,Rak A-03,Rak B-01,Rak B-02,Rak B-03,Gantungan 01,Gantungan 02') as laundry_rack_locations,
		       COALESCE(laundry_prefix, 'LND') as laundry_prefix,
		       COALESCE(min_spend_for_member, 100000) as min_spend_for_member,
		       COALESCE(point_rate, 10000) as point_rate,
		       COALESCE(point_value, 100) as point_value,
		       COALESCE(gold_threshold, 1000000) as gold_threshold,
		       COALESCE(platinum_threshold, 5000000) as platinum_threshold,
		       COALESCE(theme_color, 'emerald') as theme_color,
		       COALESCE(tagline, 'Sehat Alami, Hidup Harmoni') as tagline,
		       instagram_url, facebook_url, whatsapp_number, footer_text, store_reviews, store_features,
		       auth_background, custom_domain, favicon_url, barcode_settings
		FROM settings
		WHERE user_id = $1
	`, tenantID)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"business_name":         "Toko Saya",
			"tax_rate":              0,
			"currency":              "IDR",
			"receipt_template":      "default",
			"print_receipt":         true,
			"online_store_enabled":  true,
			"service_queue_enabled": false,
			"workshop_enabled":      false,
			"barbershop_enabled":    false,
			"fnb_enabled":           false,
			"laundry_enabled":       false,
			"fnb_service_charge_percent": 0,
			"service_stations":      "Pit 1,Pit 2,Pit 3,Kursi 1,Kursi 2",
			"queue_prefix":          "A",
			"laundry_perfume_options": "Akasia,Downy Red,Sakura,Ocean Fresh,Lavender,Snappy,Molto Blue",
			"laundry_rack_locations": "Rak A-01,Rak A-02,Rak A-03,Rak B-01,Rak B-02,Rak B-03,Gantungan 01,Gantungan 02",
			"laundry_prefix":        "LND",
			"barcode_settings":      "",
		})
		return
	}
	c.JSON(http.StatusOK, s)
}

func (h *AdminHandler) UpdateSettings(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		BusinessName          string   `json:"business_name"`
		BusinessAddress       string   `json:"business_address"`
		BusinessPhone         string   `json:"business_phone"`
		BusinessEmail         string   `json:"business_email"`
		BusinessLogo          string   `json:"business_logo"`
		LogoURL               string   `json:"logo_url"`
		Description           string   `json:"description"`
		TaxRate               *float64 `json:"tax_rate"`
		DefaultDiscount       *float64 `json:"default_discount"`
		Currency              string   `json:"currency"`
		ReceiptTemplate       string   `json:"receipt_template"`
		ReceiptFooter         string   `json:"receipt_footer"`
		PrintReceipt          *bool    `json:"print_receipt"`
		LowStockNotification *bool    `json:"low_stock_notification"`
		AutoBackup            *bool    `json:"auto_backup"`
		OnlineStoreEnabled    *bool    `json:"online_store_enabled"`
		ServiceQueueEnabled   *bool    `json:"service_queue_enabled"`
		WorkshopEnabled       *bool    `json:"workshop_enabled"`
		BarbershopEnabled     *bool    `json:"barbershop_enabled"`
		FnbEnabled            *bool    `json:"fnb_enabled"`
		LaundryEnabled        *bool    `json:"laundry_enabled"`
		FnbServiceChargePct   *float64 `json:"fnb_service_charge_percent"`
		ServiceStations       *string  `json:"service_stations"`
		QueuePrefix           *string  `json:"queue_prefix"`
		LaundryPerfumeOptions *string  `json:"laundry_perfume_options"`
		LaundryRackLocations  *string  `json:"laundry_rack_locations"`
		LaundryPrefix         *string  `json:"laundry_prefix"`
		MinSpendForMember     *float64 `json:"min_spend_for_member"`
		PointRate             *float64 `json:"point_rate"`
		PointValue            *float64 `json:"point_value"`
		GoldThreshold         *float64 `json:"gold_threshold"`
		PlatinumThreshold     *float64 `json:"platinum_threshold"`
		AuthBackground        *string  `json:"auth_background"`
		ThemeColor            *string  `json:"theme_color"`
		Tagline               *string  `json:"tagline"`
		InstagramURL          *string  `json:"instagram_url"`
		FacebookURL           *string  `json:"facebook_url"`
		WhatsAppNumber        *string  `json:"whatsapp_number"`
		FooterText            *string  `json:"footer_text"`
		StoreReviews          *string  `json:"store_reviews"`
		StoreFeatures         *string  `json:"store_features"`
		CustomDomain          *string  `json:"custom_domain"`
		FaviconURL            *string  `json:"favicon_url"`
		BarcodeSettings       *string  `json:"barcode_settings"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Invalid data")
		return
	}

	bName := req.BusinessName
	if bName == "" {
		bName = "Toko Saya"
	}
	curr := req.Currency
	if curr == "" {
		curr = "IDR"
	}

	var cleanCustomDomain *string
	if req.CustomDomain != nil {
		d := strings.TrimSpace(strings.ToLower(*req.CustomDomain))
		d = strings.TrimPrefix(d, "https://")
		d = strings.TrimPrefix(d, "http://")
		d = strings.TrimRight(d, "/")
		if idx := strings.Index(d, "/"); idx != -1 {
			d = d[:idx]
		}
		if idx := strings.Index(d, ":"); idx != -1 {
			d = d[:idx]
		}
		if d != "" {
			var existingOwner string
			_ = database.DB.Get(&existingOwner, "SELECT user_id FROM settings WHERE custom_domain = $1 AND user_id != $2", d, tenantID)
			if existingOwner != "" {
				utils.RespondError(c, http.StatusBadRequest, "Domain ini sudah digunakan oleh toko lain")
				return
			}
			cleanCustomDomain = &d
		}
	}

	_, err := database.DB.Exec(`
		INSERT INTO settings (
			id, user_id, business_name, business_address, business_phone, business_email,
			business_logo, logo_url, description, tax_rate, default_discount, currency,
			receipt_template, receipt_footer, print_receipt, low_stock_notification,
			auto_backup, online_store_enabled, service_queue_enabled, workshop_enabled, barbershop_enabled, fnb_enabled, laundry_enabled, fnb_service_charge_percent, service_stations, queue_prefix,
			laundry_perfume_options, laundry_rack_locations, laundry_prefix,
			min_spend_for_member, point_rate, point_value,
			gold_threshold, platinum_threshold, auth_background, theme_color, tagline,
			instagram_url, facebook_url, whatsapp_number, footer_text, store_reviews, store_features,
			custom_domain, favicon_url, barcode_settings
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, COALESCE($10, 0), COALESCE($11, 0), $12,
			$13, $14, COALESCE($15, true), COALESCE($16, true),
			COALESCE($17, false), COALESCE($18, true), COALESCE($19, false), COALESCE($20, false), COALESCE($21, false), COALESCE($22, false), COALESCE($23, false), COALESCE($24, 0), COALESCE($25, 'Pit 1,Pit 2,Pit 3,Kursi 1,Kursi 2'), COALESCE($26, 'A'),
			COALESCE($27, 'Akasia,Downy Red,Sakura,Ocean Fresh,Lavender,Snappy,Molto Blue'), COALESCE($28, 'Rak A-01,Rak A-02,Rak A-03,Rak B-01,Rak B-02,Rak B-03,Gantungan 01,Gantungan 02'), COALESCE($29, 'LND'),
			COALESCE($30, 100000), COALESCE($31, 10000), COALESCE($32, 100),
			COALESCE($33, 1000000), COALESCE($34, 5000000), $35, COALESCE($36, 'emerald'), COALESCE($37, 'Sehat Alami, Hidup Harmoni'),
			$38, $39, $40, $41, $42, $43,
			$44, $45, $46
		)
		ON CONFLICT (user_id) DO UPDATE SET
			business_name = EXCLUDED.business_name,
			business_address = EXCLUDED.business_address,
			business_phone = EXCLUDED.business_phone,
			business_email = EXCLUDED.business_email,
			business_logo = COALESCE(EXCLUDED.business_logo, settings.business_logo),
			logo_url = COALESCE(EXCLUDED.logo_url, settings.logo_url),
			description = EXCLUDED.description,
			tax_rate = EXCLUDED.tax_rate,
			default_discount = EXCLUDED.default_discount,
			currency = EXCLUDED.currency,
			receipt_template = EXCLUDED.receipt_template,
			receipt_footer = EXCLUDED.receipt_footer,
			print_receipt = EXCLUDED.print_receipt,
			low_stock_notification = EXCLUDED.low_stock_notification,
			auto_backup = EXCLUDED.auto_backup,
			online_store_enabled = EXCLUDED.online_store_enabled,
			service_queue_enabled = COALESCE(EXCLUDED.service_queue_enabled, settings.service_queue_enabled),
			workshop_enabled = COALESCE(EXCLUDED.workshop_enabled, settings.workshop_enabled),
			barbershop_enabled = COALESCE(EXCLUDED.barbershop_enabled, settings.barbershop_enabled),
			fnb_enabled = COALESCE(EXCLUDED.fnb_enabled, settings.fnb_enabled),
			laundry_enabled = COALESCE(EXCLUDED.laundry_enabled, settings.laundry_enabled),
			fnb_service_charge_percent = COALESCE(EXCLUDED.fnb_service_charge_percent, settings.fnb_service_charge_percent),
			service_stations = COALESCE(EXCLUDED.service_stations, settings.service_stations),
			queue_prefix = COALESCE(EXCLUDED.queue_prefix, settings.queue_prefix),
			laundry_perfume_options = COALESCE(EXCLUDED.laundry_perfume_options, settings.laundry_perfume_options),
			laundry_rack_locations = COALESCE(EXCLUDED.laundry_rack_locations, settings.laundry_rack_locations),
			laundry_prefix = COALESCE(EXCLUDED.laundry_prefix, settings.laundry_prefix),
			min_spend_for_member = EXCLUDED.min_spend_for_member,
			point_rate = EXCLUDED.point_rate,
			point_value = EXCLUDED.point_value,
			gold_threshold = EXCLUDED.gold_threshold,
			platinum_threshold = EXCLUDED.platinum_threshold,
			auth_background = COALESCE(EXCLUDED.auth_background, settings.auth_background),
			theme_color = COALESCE(EXCLUDED.theme_color, settings.theme_color),
			tagline = COALESCE(EXCLUDED.tagline, settings.tagline),
			instagram_url = COALESCE(EXCLUDED.instagram_url, settings.instagram_url),
			facebook_url = COALESCE(EXCLUDED.facebook_url, settings.facebook_url),
			whatsapp_number = COALESCE(EXCLUDED.whatsapp_number, settings.whatsapp_number),
			footer_text = COALESCE(EXCLUDED.footer_text, settings.footer_text),
			store_reviews = COALESCE(EXCLUDED.store_reviews, settings.store_reviews),
			store_features = COALESCE(EXCLUDED.store_features, settings.store_features),
			custom_domain = $44,
			favicon_url = COALESCE(EXCLUDED.favicon_url, settings.favicon_url),
			barcode_settings = COALESCE(EXCLUDED.barcode_settings, settings.barcode_settings),
			updated_at = CURRENT_TIMESTAMP
	`, utils.GenerateUUID(), tenantID, bName, req.BusinessAddress, req.BusinessPhone, req.BusinessEmail,
		req.BusinessLogo, req.LogoURL, req.Description, req.TaxRate, req.DefaultDiscount, curr,
		req.ReceiptTemplate, req.ReceiptFooter, req.PrintReceipt, req.LowStockNotification,
		req.AutoBackup, req.OnlineStoreEnabled, req.ServiceQueueEnabled, req.WorkshopEnabled, req.BarbershopEnabled, req.FnbEnabled, req.LaundryEnabled, req.FnbServiceChargePct, req.ServiceStations, req.QueuePrefix,
		req.LaundryPerfumeOptions, req.LaundryRackLocations, req.LaundryPrefix,
		req.MinSpendForMember, req.PointRate, req.PointValue,
		req.GoldThreshold, req.PlatinumThreshold, req.AuthBackground, req.ThemeColor, req.Tagline,
		req.InstagramURL, req.FacebookURL, req.WhatsAppNumber, req.FooterText, req.StoreReviews, req.StoreFeatures,
		cleanCustomDomain, req.FaviconURL, req.BarcodeSettings)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	h.GetSettings(c)
}

func (h *AdminHandler) VerifyCustomDomain(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Domain string `json:"domain"`
	}
	_ = c.ShouldBindJSON(&req)

	domainToVerify := strings.TrimSpace(strings.ToLower(req.Domain))
	if domainToVerify == "" {
		var currentDomain sql.NullString
		_ = database.DB.Get(&currentDomain, "SELECT custom_domain FROM settings WHERE user_id = $1", tenantID)
		if currentDomain.Valid {
			domainToVerify = currentDomain.String
		}
	}

	domainToVerify = strings.TrimPrefix(domainToVerify, "https://")
	domainToVerify = strings.TrimPrefix(domainToVerify, "http://")
	domainToVerify = strings.TrimRight(domainToVerify, "/")
	if idx := strings.Index(domainToVerify, "/"); idx != -1 {
		domainToVerify = domainToVerify[:idx]
	}
	if idx := strings.Index(domainToVerify, ":"); idx != -1 {
		domainToVerify = domainToVerify[:idx]
	}

	if domainToVerify == "" {
		utils.RespondValidationError(c, "Nama domain wajib diisi untuk verifikasi DNS")
		return
	}

	// 1. Lookup Host IP addresses
	ips, err := net.LookupHost(domainToVerify)
	resolved := err == nil && len(ips) > 0

	// 2. Lookup CNAME
	cname, _ := net.LookupCNAME(domainToVerify)
	cname = strings.TrimSuffix(cname, ".")

	targetHost := "pos.elvisyam.com"
	isMatched := false
	if resolved {
		isMatched = true
	}
	if strings.Contains(strings.ToLower(cname), "elvisyam") {
		isMatched = true
	}

	msg := "DNS record belum terdeteksi. Silakan periksa konfigurasi CNAME atau A record di registrar domain Anda."
	if isMatched {
		msg = "DNS domain berhasil terhubung dan mengarah ke server POS!"
	} else if resolved {
		msg = "Domain terdeteksi memiliki DNS, pastikan CNAME mengarah ke " + targetHost + " atau A record ke IP server."
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"domain":     domainToVerify,
		"resolved":   resolved,
		"ips":        ips,
		"cname":      cname,
		"targetHost": targetHost,
		"isMatched":  isMatched,
		"message":    msg,
	})
}

// -------------------------------------------------------------
// LANDING CMS & SMTP & AI SETTINGS
// -------------------------------------------------------------

func (h *AdminHandler) GetLandingCMS(c *gin.Context) {
	var cmsMap map[string]interface{}

	// 1. Try reading from PostgreSQL database first (permanent & persistent)
	var dbContent string
	errDB := database.DB.Get(&dbContent, "SELECT content FROM landing_cms WHERE id = 'global' LIMIT 1")
	if errDB == nil && dbContent != "" {
		_ = json.Unmarshal([]byte(dbContent), &cmsMap)
	}

	// 2. Fallback to JSON file if not in DB
	if cmsMap == nil {
		cmsFile := filepath.Join(config.AppConfig.UploadsDir, "landing_cms.json")
		data, err := os.ReadFile(cmsFile)
		if err == nil {
			_ = json.Unmarshal(data, &cmsMap)
		}
	}

	if cmsMap == nil {
		cmsMap = make(map[string]interface{})
	}

	// Ensure all standard fields exist
	if _, ok := cmsMap["brandName"]; !ok {
		cmsMap["brandName"] = "POS-INV"
	}
	if logo, ok := cmsMap["logoUrl"].(string); !ok || logo == "" {
		var storeLogo string
		_ = database.DB.Get(&storeLogo, `
			SELECT COALESCE(NULLIF(logo_url, ''), NULLIF(business_logo, ''), '')
			FROM settings
			ORDER BY created_at ASC
			LIMIT 1
		`)
		if storeLogo != "" {
			cmsMap["logoUrl"] = storeLogo
		}
	}
	if _, ok := cmsMap["hero"]; !ok {
		cmsMap["hero"] = gin.H{
			"badge":          "Solusi POS Modern untuk Bisnis Anda",
			"titlePrefix":    "Kelola Inventaris & Penjualan ",
			"titleHighlight": "Lebih Cerdas",
			"description":    "Sistem Kasir (POS) dan Inventaris terintegrasi yang dirancang untuk mempercepat transaksi, mengelola stok secara real-time, dan memberikan laporan bisnis yang akurat.",
			"primaryCta":     "Coba Gratis",
			"secondaryCta":   "Lihat Demo Toko",
		}
	}
	if _, ok := cmsMap["stats"]; !ok {
		cmsMap["stats"] = []gin.H{
			{"label": "Transaksi/Bulan", "value": "10K+"},
			{"label": "UMKM Terbantu", "value": "500+"},
			{"label": "Efisiensi Waktu", "value": "45%"},
			{"label": "Akurasi Stok", "value": "99.9%"},
		}
	}
	if _, ok := cmsMap["featuresHeader"]; !ok {
		cmsMap["featuresHeader"] = gin.H{
			"title":       "Semua yang Anda Butuhkan untuk Berkembang",
			"description": "Fitur lengkap yang dirancang khusus untuk memudahkan operasional harian bisnis ritel dan jasa.",
		}
	}
	if _, ok := cmsMap["features"]; !ok {
		cmsMap["features"] = []gin.H{
			{
				"icon":        "Zap",
				"title":       "Point of Sale Cepat",
				"description": "Proses transaksi kilat dengan antarmuka yang intuitif dan mudah dipelajari oleh staf baru sekalipun.",
			},
			{
				"icon":        "Package",
				"title":       "Manajemen Inventaris",
				"description": "Pantau stok secara real-time, kelola kategori produk, dan dapatkan peringatan otomatis saat stok menipis.",
			},
			{
				"icon":        "BarChart3",
				"title":       "Laporan Mendalam",
				"description": "Analisis performa penjualan, profit sharing, dan arus kas dengan laporan grafis yang mudah dipahami.",
			},
			{
				"icon":        "Users",
				"title":       "Manajemen Pelanggan",
				"description": "Bangun loyalitas dengan database pelanggan terintegrasi dan pantau riwayat pembelian mereka.",
			},
			{
				"icon":        "ShoppingCart",
				"title":       "Toko Online Terintegrasi",
				"description": "Buka cabang digital dengan fitur Store yang memungkinkan pelanggan memesan langsung secara online.",
			},
			{
				"icon":        "Database",
				"title":       "Backup & Keamanan",
				"description": "Data Anda aman dengan fitur backup database rutin dan enkripsi data tingkat lanjut.",
			},
		}
	}
	if _, ok := cmsMap["showcase"]; !ok {
		cmsMap["showcase"] = gin.H{
			"title": "Dashboard Interaktif untuk Keputusan yang Lebih Baik",
			"bullets": []string{
				"Pantau pendapatan dan pengeluaran secara visual",
				"Kelola hak akses karyawan dengan sistem peran (Role-based)",
				"Integrasi otomatis dengan sistem akuntansi sederhana",
				"Akses dari perangkat mana saja (Responsif)",
			},
			"ctaText":  "Lihat Dashboard",
			"imageUrl": "",
		}
	}
	if _, ok := cmsMap["ctaSection"]; !ok {
		cmsMap["ctaSection"] = gin.H{
			"title":           "Siap Meningkatkan Bisnis Anda?",
			"description":     "Bergabunglah dengan ratusan pengusaha lainnya yang telah beralih ke POS-INV untuk operasional yang lebih efisien.",
			"primaryCta":      "Daftar Sekarang",
			"primaryCtaUrl":   "/auth",
			"secondaryCta":    "Hubungi Sales",
			"secondaryCtaUrl": "/auth",
		}
	}
	if _, ok := cmsMap["footer"]; !ok {
		cmsMap["footer"] = gin.H{
			"copyright":  "© 2026 POS-INV System. Dibuat dengan ❤️ untuk UMKM Indonesia.",
			"termsUrl":   "#",
			"privacyUrl": "#",
		}
	}
	if _, ok := cmsMap["demoAccount"]; !ok {
		cmsMap["demoAccount"] = gin.H{
			"enabled":     true,
			"email":       "demo@posh.web.id",
			"password":    "password",
			"title":       "Akun Demo Interaktif",
			"description": "Coba seluruh fitur kasir, manajemen stok, dan laporan secara langsung tanpa pendaftaran.",
		}
	}
	if _, ok := cmsMap["seo"]; !ok {
		brand := "POS-INV"
		if b, ok := cmsMap["brandName"].(string); ok && b != "" {
			brand = b
		}
		cmsMap["seo"] = gin.H{
			"title":       fmt.Sprintf("%s - Aplikasi Kasir & POS Modern Terintegrasi", brand),
			"description": "Sistem Kasir (POS) dan Manajemen Inventaris Cloud Multi-Tenant, Cepat, Akurat, dan Terintegrasi untuk Bisnis & UMKM.",
			"keywords":    "aplikasi kasir, pos system, software kasir, manajemen stok, inventori, point of sale, toko online",
			"author":      brand,
			"ogImage":     "/pwa-512x512.png",
			"faviconUrl":  "/logo.svg",
		}
	}

	// Calculate live statistics if autoSyncStats is not false
	autoSync, hasAutoSync := cmsMap["autoSyncStats"].(bool)
	if !hasAutoSync || autoSync {
		var tenantCount, txCount, prodCount int
		_ = database.DB.Get(&tenantCount, "SELECT COUNT(*) FROM users WHERE role != 'super_admin'")
		_ = database.DB.Get(&txCount, "SELECT COUNT(*) FROM transactions")
		_ = database.DB.Get(&prodCount, "SELECT COUNT(*) FROM products")

		formatNum := func(num int) string {
			if num >= 1000000 {
				return fmt.Sprintf("%.1fM+", float64(num)/1000000.0)
			}
			if num >= 1000 {
				return fmt.Sprintf("%.1fK+", float64(num)/1000.0)
			}
			if num > 0 {
				return fmt.Sprintf("%d+", num)
			}
			return "100+"
		}

		cmsMap["realStats"] = gin.H{
			"tenants":      tenantCount,
			"transactions": txCount,
			"products":     prodCount,
		}

		cmsMap["stats"] = []gin.H{
			{"label": "UMKM & Bisnis Terdaftar", "value": formatNum(tenantCount)},
			{"label": "Total Transaksi Sukses", "value": formatNum(txCount)},
			{"label": "Katalog Produk Terproses", "value": formatNum(prodCount)},
			{"label": "Uptime Systems & SLA", "value": "99.9%"},
		}
	}

	c.JSON(http.StatusOK, cmsMap)
}

func (h *AdminHandler) UpdateLandingCMS(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.RespondValidationError(c, "Invalid JSON: "+err.Error())
		return
	}

	bytes, _ := json.Marshal(body)

	// 1. Persist directly to PostgreSQL database (Atomic, robust, permanent)
	_, errDB := database.DB.Exec(`
		INSERT INTO landing_cms (id, content, updated_at) 
		VALUES ('global', $1, CURRENT_TIMESTAMP)
		ON CONFLICT (id) DO UPDATE 
		SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP
	`, string(bytes))

	if errDB != nil {
		log.Printf("Warning: Failed to save landing CMS to DB: %v", errDB)
	}

	// 2. Also write to JSON file for backup
	_ = os.MkdirAll(config.AppConfig.UploadsDir, 0777)
	cmsFile := filepath.Join(config.AppConfig.UploadsDir, "landing_cms.json")
	indentBytes, _ := json.MarshalIndent(body, "", "  ")
	_ = os.WriteFile(cmsFile, indentBytes, 0644)

	utils.RespondSuccess(c, "Landing CMS saved successfully", gin.H{"success": true})
}

func (h *AdminHandler) GetSMTPSettings(c *gin.Context) {
	var opt utils.SMTPOptions
	err := database.DB.Get(&opt, "SELECT COALESCE(smtp_host, 'smtp.gmail.com') as smtp_host, COALESCE(smtp_port, 465) as smtp_port, COALESCE(smtp_user, '') as smtp_user, COALESCE(smtp_pass, '') as smtp_pass, COALESCE(smtp_secure, 1)::boolean as smtp_secure FROM smtp_settings LIMIT 1")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"smtp_host":   "smtp.gmail.com",
			"smtp_port":   465,
			"smtp_user":   "",
			"smtp_secure": true,
		})
		return
	}
	c.JSON(http.StatusOK, opt)
}

func (h *AdminHandler) UpdateSMTPSettings(c *gin.Context) {
	var req struct {
		SMTPHost   string `json:"smtp_host"`
		SMTPPort   int    `json:"smtp_port"`
		SMTPUser   string `json:"smtp_user"`
		SMTPPass   string `json:"smtp_pass"`
		SMTPSecure bool   `json:"smtp_secure"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Invalid data")
		return
	}

	_, _ = database.DB.Exec("DELETE FROM smtp_settings")
	_, err := database.DB.Exec(`
		INSERT INTO smtp_settings (id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, utils.GenerateUUID(), req.SMTPHost, req.SMTPPort, req.SMTPUser, req.SMTPPass, req.SMTPSecure)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "SMTP settings saved", gin.H{"success": true})
}

func (h *AdminHandler) TestSMTPSettings(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" {
		utils.RespondValidationError(c, "Email tujuan wajib diisi")
		return
	}

	html := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
			<h2 style="color: #22c55e;">✅ Konfigurasi SMTP Berhasil!</h2>
			<p>Email ini dikirim untuk memverifikasi bahwa konfigurasi SMTP Anda sudah benar.</p>
			<p style="color: #666;">Waktu: %s</p>
		</div>
	`, utils.NowWIB().Format("2006-01-02 15:04:05"))

	err := utils.SendEmail(req.Email, "Test Email - POS System", html)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal mengirim email: "+err.Error())
		return
	}

	utils.RespondSuccess(c, "Email test berhasil dikirim!", gin.H{"success": true})
}

func (h *AdminHandler) GetAISettings(c *gin.Context) {
	type AISettings struct {
		ID              string  `json:"id" db:"id"`
		ActiveProvider  string  `json:"active_provider" db:"active_provider"`
		GeminiKey       *string `json:"gemini_key" db:"gemini_key"`
		OpenAIKey       *string `json:"openai_key" db:"openai_key"`
		GroqKey         *string `json:"groq_key" db:"groq_key"`
		SumoPodKey      *string `json:"sumopod_key" db:"sumopod_key"`
		SumoPodModel    *string `json:"sumopod_model" db:"sumopod_model"`
		OpenRouterKey   *string `json:"openrouter_key" db:"openrouter_key"`
		OpenRouterModel *string `json:"openrouter_model" db:"openrouter_model"`
	}

	var s AISettings
	err := database.DB.Get(&s, "SELECT id, active_provider, gemini_key, openai_key, groq_key, sumopod_key, sumopod_model, openrouter_key, openrouter_model FROM ai_settings LIMIT 1")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"active_provider":  "gemini",
			"gemini_key":       nil,
			"openai_key":       nil,
			"groq_key":         nil,
			"sumopod_key":      nil,
			"sumopod_model":    "deepseek-chat",
			"openrouter_key":   nil,
			"openrouter_model": "google/gemini-2.0-flash-exp:free",
		})
		return
	}
	c.JSON(http.StatusOK, s)
}

func (h *AdminHandler) UpdateAISettings(c *gin.Context) {
	var req struct {
		ActiveProvider  string `json:"active_provider"`
		GeminiKey       string `json:"gemini_key"`
		OpenAIKey       string `json:"openai_key"`
		GroqKey         string `json:"groq_key"`
		SumoPodKey      string `json:"sumopod_key"`
		SumoPodModel    string `json:"sumopod_model"`
		OpenRouterKey   string `json:"openrouter_key"`
		OpenRouterModel string `json:"openrouter_model"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Invalid data")
		return
	}

	_, _ = database.DB.Exec("DELETE FROM ai_settings")
	_, err := database.DB.Exec(`
		INSERT INTO ai_settings (id, active_provider, gemini_key, openai_key, groq_key, sumopod_key, sumopod_model, openrouter_key, openrouter_model)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''))
	`, utils.GenerateUUID(), req.ActiveProvider, req.GeminiKey, req.OpenAIKey, req.GroqKey, req.SumoPodKey, req.SumoPodModel, req.OpenRouterKey, req.OpenRouterModel)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "AI Settings saved", gin.H{"success": true})
}

func (h *AdminHandler) FetchOpenRouterModels(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		var dbKey *string
		_ = database.DB.Get(&dbKey, "SELECT openrouter_key FROM ai_settings LIMIT 1")
		if dbKey != nil {
			key = *dbKey
		}
	}

	req, err := http.NewRequest("GET", "https://openrouter.ai/api/v1/models", nil)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Failed to create request: "+err.Error())
		return
	}
	if key != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Failed to connect to OpenRouter: "+err.Error())
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Failed to read response: "+err.Error())
		return
	}

	c.Data(resp.StatusCode, "application/json", body)
}

func (h *AdminHandler) GetGlobalStats(c *gin.Context) {
	var totalTenants int
	_ = database.DB.Get(&totalTenants, "SELECT COUNT(*) FROM users WHERE role = 'admin'")

	var totalTransactions int
	_ = database.DB.Get(&totalTransactions, "SELECT COUNT(*) FROM transactions WHERE status = 'completed'")

	var totalTokens, usedTokens, unusedTokens int
	_ = database.DB.Get(&totalTokens, "SELECT COUNT(*) FROM registration_tokens")
	_ = database.DB.Get(&usedTokens, "SELECT COUNT(*) FROM registration_tokens WHERE status = 'used'")
	_ = database.DB.Get(&unusedTokens, "SELECT COUNT(*) FROM registration_tokens WHERE status = 'unused'")

	var smtpCount int
	_ = database.DB.Get(&smtpCount, "SELECT COUNT(*) FROM smtp_settings WHERE smtp_user IS NOT NULL AND smtp_user != ''")
	smtpConfigured := smtpCount > 0

	c.JSON(http.StatusOK, gin.H{
		"tenants": totalTenants,
		"tokens": gin.H{
			"total":  totalTokens,
			"used":   usedTokens,
			"unused": unusedTokens,
		},
		"smtpConfigured":    smtpConfigured,
		"lastGlobalBackup":  nil,
		"totalTransactions": totalTransactions,
	})
}

func (h *AdminHandler) GetGlobalAnalytics(c *gin.Context) {
	var totalTenants int
	_ = database.DB.Get(&totalTenants, "SELECT COUNT(*) FROM users WHERE role = 'admin'")

	var activeTenants int
	_ = database.DB.Get(&activeTenants, `
		SELECT COUNT(DISTINCT user_id)
		FROM transactions
		WHERE status = 'completed' AND created_at >= (CURRENT_DATE - INTERVAL '30 DAY')
	`)

	var freeCount, proCount, enterpriseCount int
	_ = database.DB.Get(&freeCount, "SELECT COUNT(*) FROM users WHERE role = 'admin' AND (subscription_tier = 'free' OR subscription_tier IS NULL)")
	_ = database.DB.Get(&proCount, "SELECT COUNT(*) FROM users WHERE role = 'admin' AND subscription_tier = 'pro'")
	_ = database.DB.Get(&enterpriseCount, "SELECT COUNT(*) FROM users WHERE role = 'admin' AND subscription_tier = 'enterprise'")

	mrr := float64(proCount*299000 + enterpriseCount*999000)
	arr := mrr * 12

	type MonthlyHist struct {
		Month        string  `json:"month" db:"month"`
		Revenue      float64 `json:"revenue" db:"revenue"`
		Transactions int     `json:"transactions" db:"transactions"`
	}

	var history []MonthlyHist
	_ = database.DB.Select(&history, `
		SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
		       COALESCE(SUM(total), 0) as revenue,
		       COUNT(id) as transactions
		FROM transactions
		WHERE status = 'completed' AND created_at >= (CURRENT_DATE - INTERVAL '6 MONTH')
		GROUP BY TO_CHAR(created_at, 'YYYY-MM')
		ORDER BY month ASC
	`)

	if history == nil {
		history = []MonthlyHist{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"totalTenants":  totalTenants,
			"activeTenants": activeTenants,
			"mrr":           mrr,
			"arr":           arr,
			"tiers": gin.H{
				"free":       freeCount,
				"pro":        proCount,
				"enterprise": enterpriseCount,
			},
			"revenueHistory": history,
		},
	})
}

// -------------------------------------------------------------
// SUPERADMIN TENANT MANAGEMENT
// -------------------------------------------------------------

type TenantListItem struct {
	ID                    string     `json:"id" db:"id"`
	Email                 string     `json:"email" db:"email"`
	FullName              string     `json:"full_name" db:"full_name"`
	Role                  string     `json:"role" db:"role"`
	SubscriptionTier      string     `json:"subscription_tier" db:"subscription_tier"`
	SubscriptionExpiresAt *time.Time `json:"subscription_expires_at" db:"subscription_expires_at"`
	MaxProducts           int        `json:"max_products" db:"max_products"`
	MaxTransactions       int        `json:"max_transactions" db:"max_transactions"`
	ServiceQueueEnabled   bool       `json:"service_queue_enabled" db:"service_queue_enabled"`
	WorkshopEnabled       bool       `json:"workshop_enabled" db:"workshop_enabled"`
	BarbershopEnabled     bool       `json:"barbershop_enabled" db:"barbershop_enabled"`
	FnbEnabled            bool       `json:"fnb_enabled" db:"fnb_enabled"`
	LaundryEnabled        bool       `json:"laundry_enabled" db:"laundry_enabled"`
	CreatedAt             time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at" db:"updated_at"`
}

func (h *AdminHandler) GetTenantsList(c *gin.Context) {
	var list []TenantListItem
	err := database.DB.Select(&list, `
		SELECT u.id, u.email, COALESCE(u.full_name, 'Toko') as full_name, u.role,
		       COALESCE(u.subscription_tier, 'free') as subscription_tier, u.subscription_expires_at,
		       COALESCE(u.max_products, 100) as max_products,
		       COALESCE(u.max_transactions, 1000) as max_transactions,
		       COALESCE(s.service_queue_enabled, false) as service_queue_enabled,
		       COALESCE(s.workshop_enabled, false) as workshop_enabled,
		       COALESCE(s.barbershop_enabled, false) as barbershop_enabled,
		       COALESCE(s.fnb_enabled, false) as fnb_enabled,
		       COALESCE(s.laundry_enabled, false) as laundry_enabled,
		       u.created_at, u.updated_at
		FROM users u
		LEFT JOIN settings s ON u.id = s.user_id
		WHERE u.role = 'admin'
		ORDER BY u.created_at DESC
	`)

	if err != nil {
		c.JSON(http.StatusOK, []TenantListItem{})
		return
	}
	if list == nil {
		list = []TenantListItem{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *AdminHandler) GetTenantsSummaries(c *gin.Context) {
	ranges := utils.GetWIBDateRanges()

	type TenantSummary struct {
		TenantID           string  `json:"tenant_id" db:"tenant_id"`
		TenantName         string  `json:"tenant_name" db:"tenant_name"`
		TenantEmail        string  `json:"tenant_email" db:"tenant_email"`
		RegisteredAt       time.Time `json:"registered_at" db:"registered_at"`
		TodayRevenue       float64 `json:"today_revenue" db:"today_revenue"`
		TodayTransactions  int     `json:"today_transactions" db:"today_transactions"`
		MonthRevenue       float64 `json:"month_revenue" db:"month_revenue"`
		MonthTransactions  int     `json:"month_transactions" db:"month_transactions"`
		MonthMargin        float64 `json:"month_margin" db:"month_margin"`
		AlltimeRevenue     float64 `json:"alltime_revenue" db:"alltime_revenue"`
		AlltimeTransactions int    `json:"alltime_transactions" db:"alltime_transactions"`
	}

	query := `
		SELECT 
			u.id as tenant_id,
			COALESCE(u.full_name, 'Toko') as tenant_name,
			u.email as tenant_email,
			u.created_at as registered_at,
			COALESCE(daily.today_revenue, 0) as today_revenue,
			COALESCE(daily.today_transactions, 0) as today_transactions,
			COALESCE(monthly.month_revenue, 0) as month_revenue,
			COALESCE(monthly.month_transactions, 0) as month_transactions,
			COALESCE(monthly.month_revenue, 0) - COALESCE(mcogs.month_cogs, 0) as month_margin,
			COALESCE(alltime.total_revenue, 0) as alltime_revenue,
			COALESCE(alltime.total_transactions, 0) as alltime_transactions
		FROM users u
		LEFT JOIN (
			SELECT user_id, SUM(total) as today_revenue, COUNT(id) as today_transactions
			FROM transactions
			WHERE created_at BETWEEN $1::timestamp AND $2::timestamp AND status = 'completed'
			GROUP BY user_id
		) daily ON u.id = daily.user_id
		LEFT JOIN (
			SELECT user_id, SUM(total) as month_revenue, COUNT(id) as month_transactions
			FROM transactions
			WHERE created_at BETWEEN $3::timestamp AND $4::timestamp AND status = 'completed'
			GROUP BY user_id
		) monthly ON u.id = monthly.user_id
		LEFT JOIN (
			SELECT t.user_id, SUM(ti.quantity * p.cost) as month_cogs
			FROM transaction_items ti
			JOIN transactions t ON ti.transaction_id = t.id
			JOIN products p ON ti.product_id = p.id
			WHERE t.created_at BETWEEN $3::timestamp AND $4::timestamp AND t.status = 'completed'
			GROUP BY t.user_id
		) mcogs ON u.id = mcogs.user_id
		LEFT JOIN (
			SELECT user_id, SUM(total) as total_revenue, COUNT(id) as total_transactions
			FROM transactions
			WHERE status = 'completed'
			GROUP BY user_id
		) alltime ON u.id = alltime.user_id
		WHERE u.role = 'admin'
		ORDER BY today_revenue DESC, month_revenue DESC;
	`

	var list []TenantSummary
	err := database.DB.Select(&list, query, ranges.TodayStart, ranges.TodayEnd, ranges.MonthStart, ranges.MonthEnd)
	if err != nil {
		c.JSON(http.StatusOK, []TenantSummary{})
		return
	}
	if list == nil {
		list = []TenantSummary{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *AdminHandler) GetTenantStats(c *gin.Context) {
	tenantID := c.Param("id")
	dateFilter := c.DefaultQuery("date_filter", "today")
	ranges := utils.GetWIBDateRanges()

	var dateQueryTx, dateQueryItems string
	var args []interface{}
	args = append(args, tenantID)

	if dateFilter == "today" {
		dateQueryTx = " AND created_at BETWEEN $2::timestamp AND $3::timestamp"
		dateQueryItems = " AND t.created_at BETWEEN $2::timestamp AND $3::timestamp"
		args = append(args, ranges.TodayStart, ranges.TodayEnd)
	} else if dateFilter == "this_month" {
		dateQueryTx = " AND created_at BETWEEN $2::timestamp AND $3::timestamp"
		dateQueryItems = " AND t.created_at BETWEEN $2::timestamp AND $3::timestamp"
		args = append(args, ranges.MonthStart, ranges.MonthEnd)
	}

	var turnover struct {
		TotalOmset        float64 `db:"total_omset"`
		TotalTransactions int     `db:"total_transaction"`
	}
	_ = database.DB.Get(&turnover, "SELECT COALESCE(SUM(total), 0) as total_omset, COUNT(*) as total_transaction FROM transactions WHERE user_id = $1 AND status = 'completed'"+dateQueryTx, args...)

	var assets struct {
		TotalAset    float64 `db:"total_aset"`
		TotalProduct int     `db:"total_product"`
	}
	_ = database.DB.Get(&assets, "SELECT COALESCE(SUM(cost * stock), 0) as total_aset, COUNT(*) as total_product FROM products WHERE user_id = $1 AND product_type = 'physical'", tenantID)

	var totalCOGS float64
	_ = database.DB.Get(&totalCOGS, "SELECT COALESCE(SUM(ti.quantity * p.cost), 0) FROM transaction_items ti JOIN transactions t ON ti.transaction_id = t.id JOIN products p ON ti.product_id = p.id WHERE t.user_id = $1 AND t.status = 'completed'"+dateQueryItems, args...)

	type TopProd struct {
		Name     string `json:"name" db:"name"`
		Quantity int    `json:"quantity" db:"total_sold"`
	}
	var topProds []TopProd
	_ = database.DB.Select(&topProds, `
		SELECT p.name, SUM(ti.quantity) as total_sold
		FROM transaction_items ti
		JOIN transactions t ON ti.transaction_id = t.id
		JOIN products p ON ti.product_id = p.id
		WHERE t.user_id = $1 AND t.status = 'completed'`+dateQueryItems+`
		GROUP BY p.id, p.name
		ORDER BY total_sold DESC
		LIMIT 1
	`, args...)

	var topProduct interface{} = nil
	if len(topProds) > 0 {
		topProduct = topProds[0]
	}

	c.JSON(http.StatusOK, gin.H{
		"totalSales":        turnover.TotalOmset,
		"totalTransactions": turnover.TotalTransactions,
		"totalAssets":       assets.TotalAset,
		"totalProducts":     assets.TotalProduct,
		"margin":            turnover.TotalOmset - totalCOGS,
		"topProduct":         topProduct,
	})
}

func (h *AdminHandler) GetTenantProducts(c *gin.Context) {
	tenantID := c.Param("id")

	query := `
		SELECT p.id, p.user_id, p.name, p.sku, p.barcode, p.category, p.category_id,
		       p.brand, p.description, p.price, p.cost as "costPrice", p.stock,
		       p.min_stock as "minStock", p.unit, p.image,
		       p.show_in_online_store as "showInOnlineStore",
		       p.product_type as "productType",
		       p.ownership_type as "ownershipType",
		       p.supplier, p.created_at,
		       c.name as category_name, c.color as category_color
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.user_id = $1
		ORDER BY p.name ASC
	`

	var list []gin.H
	rows, err := database.DB.Queryx(query, tenantID)
	if err != nil {
		c.JSON(http.StatusOK, []gin.H{})
		return
	}
	defer rows.Close()

	for rows.Next() {
		entry := make(map[string]interface{})
		_ = rows.MapScan(entry)
		list = append(list, entry)
	}

	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *AdminHandler) GetTenantDailySales(c *gin.Context) {
	tenantID := c.Param("id")
	ranges := utils.GetWIBDateRanges()

	type DailyTx struct {
		ID            string   `json:"id" db:"id"`
		InvoiceNo     string   `json:"invoice_no" db:"invoice_no"`
		InvoiceNumber string   `json:"invoice_number" db:"invoice_number"`
		Total         float64  `json:"total" db:"total"`
		PaymentMethod string   `json:"payment_method" db:"payment_method"`
		Status        string   `json:"status" db:"status"`
		CashierName   string   `json:"cashier_name" db:"cashier_name"`
		Latitude      *float64 `json:"latitude" db:"latitude"`
		Longitude     *float64 `json:"longitude" db:"longitude"`
		CreatedAt     string   `json:"created_at" db:"created_at"`
	}

	var list []DailyTx
	err := database.DB.Select(&list, `
		SELECT id,
		       COALESCE(invoice_number, '') as invoice_no,
		       COALESCE(invoice_number, '') as invoice_number,
		       total,
		       COALESCE(payment_method, 'cash') as payment_method,
		       status,
		       COALESCE(cashier_name, 'Kasir') as cashier_name,
		       latitude, longitude,
		       TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at
		FROM transactions
		WHERE user_id = $1 AND status = 'completed' AND created_at BETWEEN $2::timestamp AND $3::timestamp
		ORDER BY created_at DESC
	`, tenantID, ranges.TodayStart, ranges.TodayEnd)

	if err != nil {
		c.JSON(http.StatusOK, []DailyTx{})
		return
	}
	if list == nil {
		list = []DailyTx{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *AdminHandler) CreateTenant(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" || req.Password == "" || req.FullName == "" {
		utils.RespondValidationError(c, "Email, password, dan nama toko wajib diisi")
		return
	}

	var existingID string
	_ = database.DB.Get(&existingID, "SELECT id FROM users WHERE email = $1", req.Email)
	if existingID != "" {
		utils.RespondError(c, http.StatusBadRequest, "Email already registered")
		return
	}

	id := utils.GenerateUUID()
	hashedPassword, _ := utils.HashPassword(req.Password)

	_, err := database.DB.Exec(`
		INSERT INTO users (id, email, password, full_name, role, tenant_id)
		VALUES ($1, $2, $3, $4, 'admin', $5)
	`, id, req.Email, hashedPassword, req.FullName, id)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	_, _ = database.DB.Exec(`
		INSERT INTO settings (id, user_id, business_name)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id) DO NOTHING
	`, utils.GenerateUUID(), id, "Toko "+req.FullName)

	c.JSON(http.StatusOK, gin.H{
		"id":        id,
		"email":     req.Email,
		"full_name": req.FullName,
		"role":      "admin",
	})
}

func (h *AdminHandler) UpdateTenant(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Email    string `json:"email"`
		FullName string `json:"full_name"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Invalid data")
		return
	}

	if req.Password != "" {
		hashed, _ := utils.HashPassword(req.Password)
		_, err := database.DB.Exec("UPDATE users SET full_name = $1, email = $2, password = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND role = 'admin'", req.FullName, req.Email, hashed, id)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, err.Error())
			return
		}
	} else {
		_, err := database.DB.Exec("UPDATE users SET full_name = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND role = 'admin'", req.FullName, req.Email, id)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, err.Error())
			return
		}
	}

	utils.RespondSuccess(c, "Tenant updated successfully", gin.H{"success": true})
}

func (h *AdminHandler) DeleteTenant(c *gin.Context) {
	id := c.Param("id")

	var txCount, prodCount int
	_ = database.DB.Get(&txCount, "SELECT COUNT(*) FROM transactions WHERE user_id = $1", id)
	_ = database.DB.Get(&prodCount, "SELECT COUNT(*) FROM products WHERE user_id = $1", id)

	if txCount > 0 || prodCount > 0 {
		utils.RespondError(c, http.StatusBadRequest, "Tenant tidak bisa dihapus karena sudah memiliki data transaksi atau produk.")
		return
	}

	_, _ = database.DB.Exec("DELETE FROM settings WHERE user_id = $1", id)
	_, err := database.DB.Exec("DELETE FROM users WHERE id = $1 AND role = 'admin'", id)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Tenant deleted successfully", gin.H{"success": true})
}

func (h *AdminHandler) UpdateTenantSubscription(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		SubscriptionTier      string `json:"subscription_tier"`
		SubscriptionExpiresAt string `json:"subscription_expires_at"`
		MaxProducts           int    `json:"max_products"`
		MaxTransactions       int    `json:"max_transactions"`
		ServiceQueueEnabled   *bool  `json:"service_queue_enabled"`
		WorkshopEnabled       *bool  `json:"workshop_enabled"`
		BarbershopEnabled     *bool  `json:"barbershop_enabled"`
		FnbEnabled            *bool  `json:"fnb_enabled"`
		LaundryEnabled        *bool  `json:"laundry_enabled"`
	}
	_ = c.ShouldBindJSON(&req)

	tier := req.SubscriptionTier
	if tier == "" {
		tier = "free"
	}
	maxProd := req.MaxProducts
	if maxProd <= 0 {
		maxProd = 100
	}
	maxTx := req.MaxTransactions
	if maxTx <= 0 {
		maxTx = 1000
	}

	_, err := database.DB.Exec(`
		UPDATE users
		SET subscription_tier = $1,
		    subscription_expires_at = NULLIF($2, '')::timestamp,
		    max_products = $3,
		    max_transactions = $4,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
	`, tier, req.SubscriptionExpiresAt, maxProd, maxTx, id)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal mengupdate data pengguna: "+err.Error())
		return
	}

	// Update or insert settings row for tenant modules
	var settingsCount int
	_ = database.DB.Get(&settingsCount, "SELECT COUNT(*) FROM settings WHERE user_id = $1", id)
	if settingsCount == 0 {
		_, errInsert := database.DB.Exec(`
			INSERT INTO settings (
				id, user_id, service_queue_enabled, workshop_enabled, barbershop_enabled, fnb_enabled, laundry_enabled, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
		`, utils.GenerateUUID(), id,
			req.ServiceQueueEnabled != nil && *req.ServiceQueueEnabled,
			req.WorkshopEnabled != nil && *req.WorkshopEnabled,
			req.BarbershopEnabled != nil && *req.BarbershopEnabled,
			req.FnbEnabled != nil && *req.FnbEnabled,
			req.LaundryEnabled != nil && *req.LaundryEnabled,
		)
		if errInsert != nil {
			log.Printf("⚠️ Insert settings for tenant %s error: %v", id, errInsert)
		}
	} else {
		sqVal := false
		if req.ServiceQueueEnabled != nil {
			sqVal = *req.ServiceQueueEnabled
		}
		wsVal := false
		if req.WorkshopEnabled != nil {
			wsVal = *req.WorkshopEnabled
		}
		bsVal := false
		if req.BarbershopEnabled != nil {
			bsVal = *req.BarbershopEnabled
		}
		fnbVal := false
		if req.FnbEnabled != nil {
			fnbVal = *req.FnbEnabled
		}
		lndVal := false
		if req.LaundryEnabled != nil {
			lndVal = *req.LaundryEnabled
		}

		_, errUpdate := database.DB.Exec(`
			UPDATE settings
			SET service_queue_enabled = $1,
			    workshop_enabled = $2,
			    barbershop_enabled = $3,
			    fnb_enabled = $4,
			    laundry_enabled = $5,
			    updated_at = CURRENT_TIMESTAMP
			WHERE user_id = $6
		`, sqVal, wsVal, bsVal, fnbVal, lndVal, id)
		if errUpdate != nil {
			log.Printf("⚠️ Update settings for tenant %s error: %v", id, errUpdate)
		}
	}

	utils.RespondSuccess(c, "Pengaturan langganan dan modul tenant berhasil disimpan!", gin.H{"success": true})
}

func (h *AdminHandler) ImpersonateTenant(c *gin.Context) {
	id := c.Param("id")

	var targetUser struct {
		ID       string `db:"id"`
		Email    string `db:"email"`
		Role     string `db:"role"`
		TenantID string `db:"tenant_id"`
	}
	err := database.DB.Get(&targetUser, "SELECT id, email, role, COALESCE(tenant_id, id) as tenant_id FROM users WHERE id = $1", id)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Tenant user not found")
		return
	}

	token, err := utils.GenerateJWT(targetUser.ID, targetUser.Email, targetUser.Role, targetUser.TenantID, config.AppConfig.JWTSecret)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Failed to generate session token")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"token":   token,
	})
}

func (h *AdminHandler) GetAllTransactions(c *gin.Context) {
	type AllTx struct {
		ID            string  `json:"id" db:"id"`
		TenantID      string  `json:"user_id" db:"user_id"`
		TenantEmail   string  `json:"tenant_email" db:"tenant_email"`
		InvoiceNumber string  `json:"invoice_number" db:"invoice_number"`
		Total         float64 `json:"total" db:"total"`
		PaymentMethod string  `json:"payment_method" db:"payment_method"`
		Status        string  `json:"status" db:"status"`
		CreatedAt     string  `json:"created_at" db:"created_at"`
	}

	var list []AllTx
	err := database.DB.Select(&list, `
		SELECT t.id, t.user_id, COALESCE(u.email, 'Unknown') as tenant_email,
		       COALESCE(t.invoice_number, '') as invoice_number, COALESCE(t.total, 0) as total,
		       COALESCE(t.payment_method, 'cash') as payment_method, COALESCE(t.status, 'completed') as status,
		       TO_CHAR(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at
		FROM transactions t
		LEFT JOIN users u ON t.user_id = u.id
		ORDER BY t.created_at DESC
		LIMIT 100
	`)
	if err != nil {
		c.JSON(http.StatusOK, []AllTx{})
		return
	}
	if list == nil {
		list = []AllTx{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *AdminHandler) GetAuditLogs(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	type AuditRow struct {
		ID         string    `json:"id" db:"id"`
		UserID     string    `json:"user_id" db:"user_id"`
		UserName   *string   `json:"user_name" db:"user_name"`
		UserEmail  *string   `json:"user_email" db:"user_email"`
		ActionType string    `json:"action_type" db:"action_type"`
		EntityType string    `json:"entity_type" db:"entity_type"`
		EntityID   *string   `json:"entity_id" db:"entity_id"`
		IPAddress  *string   `json:"ip_address" db:"ip_address"`
		CreatedAt  time.Time `json:"created_at" db:"created_at"`
	}

	var logs []AuditRow
	var err error

	if user.Role == "super_admin" {
		err = database.DB.Select(&logs, `
			SELECT a.id, a.user_id, u.full_name as user_name, u.email as user_email,
			       a.action_type, a.entity_type, a.entity_id, a.ip_address, a.created_at
			FROM audit_logs a
			LEFT JOIN users u ON a.user_id = u.id
			ORDER BY a.created_at DESC
			LIMIT 500
		`)
	} else {
		err = database.DB.Select(&logs, `
			SELECT a.id, a.user_id, u.full_name as user_name, u.email as user_email,
			       a.action_type, a.entity_type, a.entity_id, a.ip_address, a.created_at
			FROM audit_logs a
			LEFT JOIN users u ON a.user_id = u.id
			WHERE a.user_id IN (SELECT id FROM users WHERE tenant_id = $1 OR id = $1)
			ORDER BY a.created_at DESC
			LIMIT 500
		`, tenantID)
	}

	if err != nil {
		c.JSON(http.StatusOK, []AuditRow{})
		return
	}
	if logs == nil {
		logs = []AuditRow{}
	}
	c.JSON(http.StatusOK, logs)
}

// -------------------------------------------------------------
// ANNOUNCEMENTS
// -------------------------------------------------------------

type AnnouncementRow struct {
	ID        string    `json:"id" db:"id"`
	Message   string    `json:"message" db:"message"`
	Type      string    `json:"type" db:"type"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

func (h *AdminHandler) GetActiveAnnouncements(c *gin.Context) {
	var list []AnnouncementRow
	err := database.DB.Select(&list, "SELECT id, message, type, is_active, created_at FROM system_announcements WHERE is_active = true ORDER BY created_at DESC")
	if err != nil {
		c.JSON(http.StatusOK, []AnnouncementRow{})
		return
	}
	if list == nil {
		list = []AnnouncementRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *AdminHandler) GetAdminAnnouncements(c *gin.Context) {
	var list []AnnouncementRow
	err := database.DB.Select(&list, "SELECT id, message, type, is_active, created_at FROM system_announcements ORDER BY created_at DESC")
	if err != nil {
		c.JSON(http.StatusOK, []AnnouncementRow{})
		return
	}
	if list == nil {
		list = []AnnouncementRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *AdminHandler) CreateAdminAnnouncement(c *gin.Context) {
	var req struct {
		Message  string `json:"message"`
		Type     string `json:"type"`
		IsActive bool   `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Message == "" {
		utils.RespondValidationError(c, "Pesan pengumuman wajib diisi")
		return
	}

	msgType := req.Type
	if msgType == "" {
		msgType = "info"
	}

	id := utils.GenerateUUID()
	_, err := database.DB.Exec("INSERT INTO system_announcements (id, message, type, is_active) VALUES ($1, $2, $3, $4)", id, req.Message, msgType, req.IsActive)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id, "message": req.Message})
}

func (h *AdminHandler) ToggleAnnouncement(c *gin.Context) {
	id := c.Param("id")
	_, err := database.DB.Exec("UPDATE system_announcements SET is_active = NOT is_active WHERE id = $1", id)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Announcement status toggled", gin.H{"success": true})
}

func (h *AdminHandler) DeleteAdminAnnouncement(c *gin.Context) {
	id := c.Param("id")
	_, err := database.DB.Exec("DELETE FROM system_announcements WHERE id = $1", id)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Announcement deleted", gin.H{"success": true})
}

// -------------------------------------------------------------
// DISCUSSIONS
// -------------------------------------------------------------

type DiscussionRow struct {
	ID        string    `json:"id" db:"id"`
	TenantID  string    `json:"tenant_id" db:"tenant_id"`
	Subject   string    `json:"subject" db:"subject"`
	Message   string    `json:"message" db:"message"`
	Status    string    `json:"status" db:"status"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type ReplyRow struct {
	ID           string    `json:"id" db:"id"`
	DiscussionID string    `json:"discussion_id" db:"discussion_id"`
	UserID       string    `json:"user_id" db:"user_id"`
	UserEmail    string    `json:"user_email" db:"user_email"`
	UserRole     string    `json:"user_role" db:"user_role"`
	Message      string    `json:"message" db:"message"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

func (h *AdminHandler) GetDiscussions(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	var list []DiscussionRow
	var err error

	if user.Role == "super_admin" {
		err = database.DB.Select(&list, "SELECT id, tenant_id, subject, message, status, created_at, updated_at FROM discussions ORDER BY updated_at DESC")
	} else {
		err = database.DB.Select(&list, "SELECT id, tenant_id, subject, message, status, created_at, updated_at FROM discussions WHERE tenant_id = $1 ORDER BY updated_at DESC", user.TenantID)
	}

	if err != nil {
		c.JSON(http.StatusOK, []DiscussionRow{})
		return
	}
	if list == nil {
		list = []DiscussionRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *AdminHandler) GetDiscussionDetail(c *gin.Context) {
	id := c.Param("id")

	var disc DiscussionRow
	err := database.DB.Get(&disc, "SELECT id, tenant_id, subject, message, status, created_at, updated_at FROM discussions WHERE id = $1", id)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Discussion not found")
		return
	}

	var replies []ReplyRow
	_ = database.DB.Select(&replies, `
		SELECT r.id, r.discussion_id, r.user_id, u.email as user_email, u.role as user_role, r.message, r.created_at
		FROM discussion_replies r
		LEFT JOIN users u ON r.user_id = u.id
		WHERE r.discussion_id = $1
		ORDER BY r.created_at ASC
	`, id)

	if replies == nil {
		replies = []ReplyRow{}
	}

	c.JSON(http.StatusOK, gin.H{
		"discussion": disc,
		"replies":    replies,
	})
}

func (h *AdminHandler) CreateDiscussion(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	var req struct {
		Subject string `json:"subject"`
		Message string `json:"message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Subject == "" || req.Message == "" {
		utils.RespondValidationError(c, "Subjek dan pesan wajib diisi")
		return
	}

	id := utils.GenerateUUID()
	_, err := database.DB.Exec(`
		INSERT INTO discussions (id, tenant_id, subject, message, status)
		VALUES ($1, $2, $3, $4, 'open')
	`, id, user.TenantID, req.Subject, req.Message)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "subject": req.Subject})
}

func (h *AdminHandler) ReplyDiscussion(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)
	discID := c.Param("id")

	var req struct {
		Message string `json:"message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Message == "" {
		utils.RespondValidationError(c, "Pesan balasan wajib diisi")
		return
	}

	replyID := utils.GenerateUUID()
	_, err := database.DB.Exec(`
		INSERT INTO discussion_replies (id, discussion_id, user_id, message)
		VALUES ($1, $2, $3, $4)
	`, replyID, discID, user.ID, req.Message)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	_, _ = database.DB.Exec("UPDATE discussions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", discID)

	utils.RespondSuccess(c, "Balasan berhasil dikirim", gin.H{"id": replyID})
}

func (h *AdminHandler) UpdateDiscussionStatus(c *gin.Context) {
	discID := c.Param("id")

	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || (req.Status != "open" && req.Status != "closed") {
		utils.RespondValidationError(c, "Status must be open or closed")
		return
	}

	_, err := database.DB.Exec("UPDATE discussions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", req.Status, discID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Discussion status updated", gin.H{"success": true})
}

// -------------------------------------------------------------
// USER MANAGEMENT
// -------------------------------------------------------------

type UserManagementRow struct {
	ID        string    `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	FullName  string    `json:"full_name" db:"full_name"`
	Role      string    `json:"role" db:"role"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

func (h *AdminHandler) GetUsers(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	var list []UserManagementRow
	var err error

	if user.Role == "super_admin" || user.Role == "superadmin" {
		err = database.DB.Select(&list, "SELECT id, email, COALESCE(full_name, 'User') as full_name, role, created_at, updated_at FROM users ORDER BY created_at DESC")
	} else {
		err = database.DB.Select(&list, `
			SELECT id, email, COALESCE(full_name, 'User') as full_name, role, created_at, updated_at 
			FROM users 
			WHERE tenant_id = $1 OR id = $1 
			ORDER BY created_at DESC
		`, user.TenantID)
	}

	if err != nil {
		c.JSON(http.StatusOK, []UserManagementRow{})
		return
	}
	if list == nil {
		list = []UserManagementRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *AdminHandler) GetUserByID(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)
	id := c.Param("id")

	var u UserManagementRow
	var err error
	if user.Role == "super_admin" || user.Role == "superadmin" {
		err = database.DB.Get(&u, "SELECT id, email, COALESCE(full_name, 'User') as full_name, role, created_at, updated_at FROM users WHERE id = $1", id)
	} else {
		err = database.DB.Get(&u, "SELECT id, email, COALESCE(full_name, 'User') as full_name, role, created_at, updated_at FROM users WHERE id = $1 AND (tenant_id = $2 OR id = $2)", id, user.TenantID)
	}
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "User tidak ditemukan")
		return
	}
	c.JSON(http.StatusOK, u)
}

func (h *AdminHandler) CreateUser(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
		Role     string `json:"role"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Email) == "" || strings.TrimSpace(req.Password) == "" {
		utils.RespondValidationError(c, "Email dan password wajib diisi")
		return
	}

	email := strings.TrimSpace(req.Email)
	var dupCount int
	_ = database.DB.Get(&dupCount, "SELECT COUNT(*) FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))", email)
	if dupCount > 0 {
		utils.RespondError(c, http.StatusBadRequest, "Email sudah terdaftar")
		return
	}

	role := strings.TrimSpace(req.Role)
	if role == "" {
		role = "kasir"
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal mengenkripsi password")
		return
	}
	id := utils.GenerateUUID()

	tenantID := user.TenantID
	if tenantID == "" {
		tenantID = user.ID
	}

	_, err = database.DB.Exec(`
		INSERT INTO users (id, email, password, full_name, role, tenant_id)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, id, email, hashedPassword, strings.TrimSpace(req.FullName), role, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":        id,
		"email":     email,
		"full_name": req.FullName,
		"role":      role,
	})
}

func (h *AdminHandler) UpdateUser(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)
	id := c.Param("id")

	var req struct {
		Email       string `json:"email"`
		FullName    string `json:"full_name"`
		Role        string `json:"role"`
		Password    string `json:"password"`
		NewPassword string `json:"new_password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Data tidak valid")
		return
	}

	// Verify target user exists and caller has permission
	var existingUser struct {
		ID       string `db:"id"`
		Email    string `db:"email"`
		FullName string `db:"full_name"`
		Role     string `db:"role"`
		TenantID string `db:"tenant_id"`
	}

	var err error
	if user.Role == "super_admin" || user.Role == "superadmin" {
		err = database.DB.Get(&existingUser, "SELECT id, email, COALESCE(full_name, '') as full_name, role, COALESCE(tenant_id, id) as tenant_id FROM users WHERE id = $1", id)
	} else {
		err = database.DB.Get(&existingUser, "SELECT id, email, COALESCE(full_name, '') as full_name, role, COALESCE(tenant_id, id) as tenant_id FROM users WHERE id = $1 AND (tenant_id = $2 OR id = $2)", id, user.TenantID)
	}

	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "User tidak ditemukan atau tidak memiliki akses")
		return
	}

	email := strings.TrimSpace(req.Email)
	if email == "" {
		email = existingUser.Email
	} else if strings.ToLower(email) != strings.ToLower(existingUser.Email) {
		var dupCount int
		_ = database.DB.Get(&dupCount, "SELECT COUNT(*) FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND id != $2", email, id)
		if dupCount > 0 {
			utils.RespondError(c, http.StatusBadRequest, "Email sudah digunakan oleh akun lain")
			return
		}
	}

	fullName := strings.TrimSpace(req.FullName)
	if fullName == "" {
		fullName = existingUser.FullName
	}

	role := strings.TrimSpace(req.Role)
	if role == "" {
		role = existingUser.Role
	}

	newPass := strings.TrimSpace(req.Password)
	if newPass == "" {
		newPass = strings.TrimSpace(req.NewPassword)
	}

	if newPass != "" {
		if len(newPass) < 6 {
			utils.RespondValidationError(c, "Password minimal 6 karakter")
			return
		}
		hashedPassword, hashErr := utils.HashPassword(newPass)
		if hashErr != nil {
			utils.RespondError(c, http.StatusInternalServerError, "Gagal mengenkripsi password")
			return
		}

		if user.Role == "super_admin" || user.Role == "superadmin" {
			_, err = database.DB.Exec(`
				UPDATE users
				SET email = $1, full_name = $2, role = $3, password = $4, updated_at = CURRENT_TIMESTAMP
				WHERE id = $5
			`, email, fullName, role, hashedPassword, id)
		} else {
			_, err = database.DB.Exec(`
				UPDATE users
				SET email = $1, full_name = $2, role = $3, password = $4, updated_at = CURRENT_TIMESTAMP
				WHERE id = $5 AND (tenant_id = $6 OR id = $6)
			`, email, fullName, role, hashedPassword, id, user.TenantID)
		}
	} else {
		if user.Role == "super_admin" || user.Role == "superadmin" {
			_, err = database.DB.Exec(`
				UPDATE users
				SET email = $1, full_name = $2, role = $3, updated_at = CURRENT_TIMESTAMP
				WHERE id = $4
			`, email, fullName, role, id)
		} else {
			_, err = database.DB.Exec(`
				UPDATE users
				SET email = $1, full_name = $2, role = $3, updated_at = CURRENT_TIMESTAMP
				WHERE id = $4 AND (tenant_id = $5 OR id = $5)
			`, email, fullName, role, id, user.TenantID)
		}
	}

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "User berhasil diperbarui", gin.H{
		"id":        id,
		"email":     email,
		"full_name": fullName,
		"role":      role,
	})
}

func (h *AdminHandler) DeleteUser(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)
	id := c.Param("id")

	if id == user.ID {
		utils.RespondError(c, http.StatusBadRequest, "Tidak dapat menghapus akun Anda sendiri")
		return
	}

	var res sql.Result
	var err error
	if user.Role == "super_admin" || user.Role == "superadmin" {
		res, err = database.DB.Exec("DELETE FROM users WHERE id = $1", id)
	} else {
		res, err = database.DB.Exec("DELETE FROM users WHERE id = $1 AND (tenant_id = $2 OR id = $2)", id, user.TenantID)
	}

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		utils.RespondError(c, http.StatusNotFound, "User tidak ditemukan atau tidak memiliki akses")
		return
	}
	utils.RespondSuccess(c, "User berhasil dihapus", gin.H{"success": true})
}

func (h *AdminHandler) ResetUserPassword(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)
	id := c.Param("id")

	var req struct {
		NewPassword string `json:"newPassword"`
		Password    string `json:"password"`
		NewPass     string `json:"new_password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Data tidak valid")
		return
	}

	targetPassword := strings.TrimSpace(req.NewPassword)
	if targetPassword == "" {
		targetPassword = strings.TrimSpace(req.Password)
	}
	if targetPassword == "" {
		targetPassword = strings.TrimSpace(req.NewPass)
	}

	if len(targetPassword) < 6 {
		utils.RespondValidationError(c, "Password minimal 6 karakter")
		return
	}

	newHash, err := utils.HashPassword(targetPassword)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal mengenkripsi password")
		return
	}

	var res sql.Result
	if user.Role == "super_admin" || user.Role == "superadmin" {
		res, err = database.DB.Exec("UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", newHash, id)
	} else {
		res, err = database.DB.Exec("UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND (tenant_id = $3 OR id = $3)", newHash, id, user.TenantID)
	}

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		utils.RespondError(c, http.StatusNotFound, "User tidak ditemukan atau tidak memiliki akses")
		return
	}

	utils.RespondSuccess(c, "Password user berhasil direset", gin.H{"success": true})
}

func (h *AdminHandler) GetRoles(c *gin.Context) {
	roles := []gin.H{
		{"id": "admin", "name": "Admin", "description": "Akses penuh ke pengaturan toko dan inventori"},
		{"id": "manager", "name": "Manager", "description": "Akses manajemen produk, stok, dan laporan"},
		{"id": "kasir", "name": "Kasir", "description": "Akses menu kasir / transaksi penjualan"},
	}
	c.JSON(http.StatusOK, roles)
}

func (h *AdminHandler) GetPermissions(c *gin.Context) {
	permissions := []gin.H{
		{"id": "pos.view", "name": "Buka Kasir POS"},
		{"id": "pos.create", "name": "Buat Transaksi Kasir"},
		{"id": "products.view", "name": "Lihat Produk"},
		{"id": "products.create", "name": "Tambah Produk"},
		{"id": "products.edit", "name": "Ubah Produk"},
		{"id": "reports.view", "name": "Lihat Laporan"},
		{"id": "inventory.view", "name": "Lihat Stok"},
		{"id": "shifts.view", "name": "Lihat Shift Kasir"},
	}
	c.JSON(http.StatusOK, permissions)
}

func (h *AdminHandler) ResetData(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	// Clear transactions & items for this tenant
	_, _ = tx.Exec("DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = $1)", user.TenantID)
	_, _ = tx.Exec("DELETE FROM transactions WHERE user_id = $1", user.TenantID)
	_, _ = tx.Exec("DELETE FROM stock_movements WHERE user_id = $1", user.TenantID)
	_, _ = tx.Exec("DELETE FROM expenses WHERE user_id = $1", user.TenantID)
	_, _ = tx.Exec("DELETE FROM incomes WHERE user_id = $1", user.TenantID)
	_, _ = tx.Exec("DELETE FROM cash_shifts WHERE tenant_id = $1", user.TenantID)

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Data transaksi dan keuangan berhasil direset", gin.H{"success": true})
}

func (h *AdminHandler) GetDemoCredentials(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"admin": gin.H{
			"email":    "demo@posh.id",
			"password": "demopassword",
		},
		"kasir": gin.H{
			"email":    "kasir@posh.id",
			"password": "kasirpassword",
		},
	})
}
