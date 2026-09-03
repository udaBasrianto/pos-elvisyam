package auth

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

func (h *AuthHandler) RegisterRoutes(r *gin.RouterGroup) {
	auth := r.Group("/auth")
	{
		auth.POST("/signup", h.SignUp)
		auth.POST("/signin", middleware.LoginRateLimit(), h.SignIn)
		auth.POST("/login", middleware.LoginRateLimit(), h.SignIn)
		auth.GET("/me", middleware.AuthenticateToken(), h.GetMe)
		auth.GET("/profile", middleware.AuthenticateToken(), h.GetMe)
		auth.POST("/change-password", middleware.AuthenticateToken(), h.ChangePassword)
		auth.PUT("/update-slug", middleware.AuthenticateToken(), h.UpdateSlug)
		auth.POST("/request-otp", h.RequestOTP)
		auth.POST("/verify-otp", h.VerifyOTP)
		auth.POST("/verify-password", middleware.AuthenticateToken(), h.VerifyPassword)
		auth.GET("/demo-info", h.GetDemoInfo)
		auth.GET("/branding", h.GetBranding)

		// Registration tokens (super_admin)
		auth.GET("/registration-tokens", middleware.AuthenticateToken(), middleware.RequireRole("super_admin"), h.GetRegistrationTokens)
		auth.POST("/registration-tokens", middleware.AuthenticateToken(), middleware.RequireRole("super_admin"), h.CreateRegistrationToken)
		auth.DELETE("/registration-tokens/:id", middleware.AuthenticateToken(), middleware.RequireRole("super_admin"), h.DeleteRegistrationToken)
	}

	// Test endpoints
	r.GET("/test-time", h.TestTime)
	r.GET("/test-transactions", h.TestTransactions)
}

func (h *AuthHandler) GetDemoInfo(c *gin.Context) {
	cmsFile := filepath.Join(config.AppConfig.UploadsDir, "landing_cms.json")
	data, err := os.ReadFile(cmsFile)
	if err == nil {
		var cmsMap map[string]interface{}
		if err := json.Unmarshal(data, &cmsMap); err == nil {
			if demoAcc, ok := cmsMap["demoAccount"]; ok && demoAcc != nil {
				c.JSON(http.StatusOK, demoAcc)
				return
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"email":       "demo@posh.web.id",
		"password":    "password",
		"title":       "Akun Demo POS POSH",
		"description": "Coba seluruh fitur kasir, manajemen stok, dan laporan secara langsung tanpa pendaftaran.",
	})
}

func (h *AuthHandler) GetBranding(c *gin.Context) {
	var branding struct {
		BusinessName   string `json:"business_name" db:"business_name"`
		BusinessLogo   string `json:"business_logo" db:"business_logo"`
		LogoURL        string `json:"logo_url" db:"logo_url"`
		Description    string `json:"description" db:"description"`
		AuthBackground string `json:"auth_background" db:"auth_background"`
	}

	err := database.DB.Get(&branding, `
		SELECT COALESCE(business_name, 'Toko Saya') as business_name,
		       COALESCE(business_logo, '') as business_logo,
		       COALESCE(logo_url, '') as logo_url,
		       COALESCE(description, '') as description,
		       COALESCE(auth_background, '') as auth_background
		FROM settings
		ORDER BY created_at ASC
		LIMIT 1
	`)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"business_name":   "POS POSH",
			"auth_background": "",
		})
		return
	}

	c.JSON(http.StatusOK, branding)
}

func (h *AuthHandler) SignUp(c *gin.Context) {
	var req struct {
		Email             string `json:"email"`
		Password          string `json:"password"`
		FullName          string `json:"full_name"`
		RegistrationToken string `json:"registrationToken"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" || req.Password == "" || req.RegistrationToken == "" {
		utils.RespondValidationError(c, "Field email, password, dan registrationToken wajib diisi")
		return
	}

	emailRegex := regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
	if !emailRegex.MatchString(req.Email) {
		utils.RespondValidationError(c, "Format email tidak valid")
		return
	}

	var existingID string
	err := database.DB.Get(&existingID, "SELECT id FROM users WHERE email = $1", req.Email)
	if err == nil && existingID != "" {
		utils.RespondValidationError(c, "Email already registered")
		return
	}

	var tokenRow struct {
		ID     string `db:"id"`
		Status string `db:"status"`
	}
	err = database.DB.Get(&tokenRow, "SELECT id, status FROM registration_tokens WHERE token = $1 AND status = 'unused'", req.RegistrationToken)
	if err != nil {
		utils.RespondValidationError(c, "Token registrasi tidak valid atau sudah digunakan")
		return
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal memproses password")
		return
	}

	userID := utils.GenerateUUID()
	fullName := req.FullName
	if fullName == "" {
		fullName = "User"
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO users (id, email, password, full_name, role, tenant_id)
		VALUES ($1, $2, $3, $4, 'admin', $1)
	`, userID, req.Email, hashedPassword, fullName)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	_, _ = tx.Exec("INSERT INTO user_roles (id, user_id, role) VALUES ($1, $2, 'admin')", utils.GenerateUUID(), userID)
	_, _ = tx.Exec("INSERT INTO settings (id, user_id, business_name) VALUES ($1, $2, 'Toko Saya')", utils.GenerateUUID(), userID)
	_, _ = tx.Exec("UPDATE registration_tokens SET status = 'used', used_by = $1, used_at = CURRENT_TIMESTAMP WHERE id = $2", userID, tokenRow.ID)

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	token, err := utils.GenerateJWT(userID, req.Email, "admin", userID, config.AppConfig.JWTSecret)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal membuat token")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":        userID,
			"email":     req.Email,
			"full_name": fullName,
			"role":      "admin",
			"tenant_id": userID,
		},
		"token": token,
	})
}

func (h *AuthHandler) SignIn(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Data login tidak valid")
		return
	}

	identifier := strings.TrimSpace(req.Email)
	if identifier == "" {
		identifier = strings.TrimSpace(req.Username)
	}

	if identifier == "" || strings.TrimSpace(req.Password) == "" {
		utils.RespondValidationError(c, "Username/Email dan password wajib diisi")
		return
	}

	normalizedIdent := strings.ToLower(identifier)

	// Convenience mapping for "admin", "demo", "superadmin"
	if normalizedIdent == "admin" {
		normalizedIdent = "admin@pos.local"
	} else if normalizedIdent == "demo" {
		normalizedIdent = "demo@posh.web.id"
	} else if normalizedIdent == "superadmin" {
		// Use SUPER_ADMIN_EMAIL env var if set
		if config.AppConfig.SuperAdminEmail != "" {
			normalizedIdent = config.AppConfig.SuperAdminEmail
		}
	}

	var user struct {
		ID       string         `db:"id"`
		Email    string         `db:"email"`
		Password string         `db:"password"`
		FullName sql.NullString `db:"full_name"`
		Role     string         `db:"role"`
		TenantID sql.NullString `db:"tenant_id"`
		ShopSlug sql.NullString `db:"shop_slug"`
	}

	err := database.DB.Get(&user, `
		SELECT id, email, password, full_name, role, tenant_id, shop_slug 
		FROM users 
		WHERE LOWER(TRIM(email)) = $1 OR LOWER(TRIM(full_name)) = $1 OR id = $1
		LIMIT 1
	`, normalizedIdent)

	if err != nil {
		// Only auto-seed in DEV_MODE — never in production
		if config.AppConfig.DevMode {
			if (normalizedIdent == "admin@pos.local" || normalizedIdent == "admin") && (req.Password == "password" || req.Password == "admin123") {
				hashed, _ := utils.HashPassword(req.Password)
				saID := utils.GenerateUUID()
				_, _ = database.DB.Exec(`
					INSERT INTO users (id, email, password, full_name, role, tenant_id)
					VALUES ($1, 'admin@pos.local', $2, 'Admin Toko', 'admin', $1)
					ON CONFLICT (email) DO NOTHING
				`, saID, hashed)
				_ = database.DB.Get(&user, "SELECT id, email, password, full_name, role, tenant_id, shop_slug FROM users WHERE email = 'admin@pos.local' LIMIT 1")
			} else {
				utils.RespondError(c, http.StatusUnauthorized, "Email atau password salah")
				return
			}
		} else {
			utils.RespondError(c, http.StatusUnauthorized, "Email atau password salah")
			return
		}
	} else {
		// Verify password for existing user
		validPass := utils.CheckPasswordHash(req.Password, user.Password)
		if !validPass {
			utils.RespondError(c, http.StatusUnauthorized, "Email atau password salah")
			return
		}
	}

	tenantID := user.TenantID.String
	if tenantID == "" {
		tenantID = user.ID
	}

	fullNameVal := "User"
	if user.FullName.Valid && user.FullName.String != "" {
		fullNameVal = user.FullName.String
	}

	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role, tenantID, config.AppConfig.JWTSecret)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal membuat sesi login")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":        user.ID,
			"name":      fullNameVal,
			"full_name": fullNameVal,
			"email":     user.Email,
			"role":      user.Role,
			"tenant_id": tenantID,
			"shop_slug": user.ShopSlug.String,
		},
		"token": token,
	})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	var dbUser struct {
		ID                     string         `db:"id"`
		Email                  string         `db:"email"`
		FullName               sql.NullString `db:"full_name"`
		Role                   string         `db:"role"`
		TenantID               sql.NullString `db:"tenant_id"`
		ShopSlug               sql.NullString `db:"shop_slug"`
		SubscriptionTier       sql.NullString `db:"subscription_tier"`
		SubscriptionExpiresAt  *time.Time     `db:"subscription_expires_at"`
		MaxProducts            int            `db:"max_products"`
		MaxTransactions        int            `db:"max_transactions"`
	}

	err := database.DB.Get(&dbUser, `
		SELECT id, email, full_name, role, tenant_id, shop_slug,
		       COALESCE(subscription_tier, 'free') as subscription_tier,
		       subscription_expires_at,
		       COALESCE(max_products, 100) as max_products,
		       COALESCE(max_transactions, 1000) as max_transactions
		FROM users WHERE id = $1 OR LOWER(TRIM(email)) = LOWER(TRIM($2)) LIMIT 1
	`, user.ID, user.Email)

	if err != nil {
		if strings.HasPrefix(strings.ToLower(user.Email), "demo@") || user.Role == "admin" {
			dbUser.ID = user.ID
			dbUser.Email = user.Email
			dbUser.Role = user.Role
			dbUser.FullName = sql.NullString{String: "Mebel Nusantara Jaya (Demo)", Valid: true}
		} else {
			utils.RespondError(c, http.StatusNotFound, "User not found")
			return
		}
	}

	tenantID := dbUser.TenantID.String
	if tenantID == "" {
		tenantID = dbUser.ID
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":                      dbUser.ID,
			"email":                   dbUser.Email,
			"full_name":               dbUser.FullName.String,
			"role":                    dbUser.Role,
			"tenant_id":               tenantID,
			"shop_slug":               dbUser.ShopSlug.String,
			"subscription_tier":       dbUser.SubscriptionTier.String,
			"subscription_expires_at": dbUser.SubscriptionExpiresAt,
			"max_products":            dbUser.MaxProducts,
			"max_transactions":        dbUser.MaxTransactions,
		},
	})
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	var req struct {
		CurrentPassword string `json:"current_password"`
		OldPassword     string `json:"currentPassword"`
		NewPassword     string `json:"new_password"`
		NewPassCamel    string `json:"newPassword"`
		Password        string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Data tidak valid")
		return
	}

	currentPass := strings.TrimSpace(req.CurrentPassword)
	if currentPass == "" {
		currentPass = strings.TrimSpace(req.OldPassword)
	}

	newPass := strings.TrimSpace(req.NewPassword)
	if newPass == "" {
		newPass = strings.TrimSpace(req.NewPassCamel)
	}
	if newPass == "" {
		newPass = strings.TrimSpace(req.Password)
	}

	if len(newPass) < 6 {
		utils.RespondValidationError(c, "Password baru minimal 6 karakter")
		return
	}

	var currentHash string
	err := database.DB.Get(&currentHash, "SELECT password FROM users WHERE id = $1", user.ID)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "User not found")
		return
	}

	if currentPass != "" {
		if !utils.CheckPasswordHash(currentPass, currentHash) {
			utils.RespondError(c, http.StatusBadRequest, "Password saat ini salah")
			return
		}
	} else {
		if user.Role != "admin" && user.Role != "super_admin" && user.Role != "superadmin" {
			utils.RespondValidationError(c, "Password saat ini wajib diisi")
			return
		}
	}

	newHash, err := utils.HashPassword(newPass)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal mengenkripsi password baru")
		return
	}

	_, err = database.DB.Exec("UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", newHash, user.ID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Password berhasil diubah", nil)
}

func (h *AuthHandler) UpdateSlug(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	var req struct {
		ShopSlug string `json:"shop_slug"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Data tidak valid")
		return
	}

	cleanSlug := strings.ToLower(strings.TrimSpace(req.ShopSlug))
	if cleanSlug == "" {
		utils.RespondValidationError(c, "Slug toko tidak boleh kosong")
		return
	}

	// Validasi format slug: hanya huruf kecil, angka, dan tanda hubung
	validSlugRegex := regexp.MustCompile(`^[a-z0-9-]+$`)
	if !validSlugRegex.MatchString(cleanSlug) {
		utils.RespondValidationError(c, "Format slug tidak valid (gunakan huruf kecil, angka, dan tanda hubung -)")
		return
	}

	tenantID := user.TenantID
	if tenantID == "" {
		tenantID = user.ID
	}

	var existingID string
	err := database.DB.Get(&existingID, `
		SELECT id FROM users 
		WHERE shop_slug = $1 AND id != $2 AND COALESCE(tenant_id, id) != $3
		LIMIT 1
	`, cleanSlug, user.ID, tenantID)
	if err == nil && existingID != "" {
		utils.RespondValidationError(c, "Slug toko sudah digunakan oleh akun lain, silakan pilih nama slug lain")
		return
	}

	_, err = database.DB.Exec(`
		UPDATE users 
		SET shop_slug = $1, updated_at = CURRENT_TIMESTAMP 
		WHERE id = $2 OR tenant_id = $2 OR id = $3 OR tenant_id = $3
	`, cleanSlug, user.ID, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"shop_slug": cleanSlug,
		"message":   "Slug toko berhasil diperbarui",
	})
}

func (h *AuthHandler) RequestOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" {
		utils.RespondValidationError(c, "Email wajib diisi")
		return
	}

	var user struct {
		ID       string         `db:"id"`
		FullName sql.NullString `db:"full_name"`
	}
	err := database.DB.Get(&user, "SELECT id, full_name FROM users WHERE email = $1", req.Email)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Email tidak terdaftar")
		return
	}

	otpCode := utils.GenerateOTP()
	expiresAt := time.Now().Add(5 * time.Minute)

	_, _ = database.DB.Exec("UPDATE otp_codes SET is_used = 1 WHERE email = $1 AND is_used = 0", req.Email)
	_, err = database.DB.Exec("INSERT INTO otp_codes (id, email, code, type, expires_at) VALUES ($1, $2, $3, 'login', $4)",
		utils.GenerateUUID(), req.Email, otpCode, expiresAt)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal membuat kode OTP")
		return
	}

	html := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
			<h2 style="color: #333; text-align: center;">Kode OTP Login</h2>
			<p>Berikut adalah kode OTP untuk login ke POS System:</p>
			<div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
				<span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: white;">%s</span>
			</div>
			<p style="color: #666; font-size: 14px;">Kode ini berlaku selama <strong>5 menit</strong>.</p>
		</div>
	`, otpCode)

	_ = utils.SendEmail(req.Email, "Kode OTP Login - POS System", html)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Kode OTP telah dikirim ke email Anda",
	})
}

func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" || req.OTP == "" {
		utils.RespondValidationError(c, "Email dan kode OTP wajib diisi")
		return
	}

	var otpRecord struct {
		ID        string    `db:"id"`
		ExpiresAt time.Time `db:"expires_at"`
	}
	err := database.DB.Get(&otpRecord, "SELECT id, expires_at FROM otp_codes WHERE email = $1 AND code = $2 AND is_used = 0 ORDER BY created_at DESC LIMIT 1", req.Email, req.OTP)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "Kode OTP salah atau sudah digunakan")
		return
	}

	if time.Now().After(otpRecord.ExpiresAt) {
		utils.RespondError(c, http.StatusBadRequest, "Kode OTP telah kedaluwarsa")
		return
	}

	_, _ = database.DB.Exec("UPDATE otp_codes SET is_used = 1 WHERE id = $1", otpRecord.ID)

	var user struct {
		ID       string         `db:"id"`
		Email    string         `db:"email"`
		FullName sql.NullString `db:"full_name"`
		Role     string         `db:"role"`
		TenantID sql.NullString `db:"tenant_id"`
		ShopSlug sql.NullString `db:"shop_slug"`
	}
	err = database.DB.Get(&user, "SELECT id, email, full_name, role, tenant_id, shop_slug FROM users WHERE email = $1", req.Email)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "User not found")
		return
	}

	tenantID := user.TenantID.String
	if tenantID == "" {
		tenantID = user.ID
	}

	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role, tenantID, config.AppConfig.JWTSecret)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal membuat sesi")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":        user.ID,
			"email":     user.Email,
			"full_name": user.FullName.String,
			"role":      user.Role,
			"tenant_id": tenantID,
			"shop_slug": user.ShopSlug.String,
		},
		"token": token,
	})
}

func (h *AuthHandler) VerifyPassword(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	var req struct {
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Password == "" {
		utils.RespondValidationError(c, "Password wajib diisi")
		return
	}

	var currentHash string
	err := database.DB.Get(&currentHash, "SELECT password FROM users WHERE id = $1", user.ID)
	if err != nil || !utils.CheckPasswordHash(req.Password, currentHash) {
		utils.RespondError(c, http.StatusUnauthorized, "Password salah")
		return
	}

	c.JSON(http.StatusOK, gin.H{"valid": true})
}

func (h *AuthHandler) GetRegistrationTokens(c *gin.Context) {
	type RegToken struct {
		ID                 string     `json:"id" db:"id"`
		Token              string     `json:"token" db:"token"`
		CreatedBy          *string    `json:"created_by" db:"created_by"`
		Status             string     `json:"status" db:"status"`
		UsedBy             *string    `json:"used_by" db:"used_by"`
		UsedByName         *string    `json:"used_by_name" db:"used_by_name"`
		UsedByEmail        *string    `json:"used_by_email" db:"used_by_email"`
		UsedByBusinessName *string    `json:"used_by_business_name" db:"used_by_business_name"`
		UsedAt             *time.Time `json:"used_at" db:"used_at"`
		CreatedAt          time.Time  `json:"created_at" db:"created_at"`
	}

	var tokens []RegToken
	err := database.DB.Select(&tokens, `
		SELECT rt.id, rt.token, rt.created_by, rt.status, rt.used_by,
		       u.full_name as used_by_name, u.email as used_by_email, s.business_name as used_by_business_name,
		       rt.used_at, rt.created_at
		FROM registration_tokens rt
		LEFT JOIN users u ON rt.used_by = u.id
		LEFT JOIN settings s ON u.id = s.user_id
		ORDER BY rt.created_at DESC
	`)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	if tokens == nil {
		tokens = []RegToken{}
	}
	c.JSON(http.StatusOK, tokens)
}

func (h *AuthHandler) CreateRegistrationToken(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	id := utils.GenerateUUID()
	tokenStr := utils.GenerateUUID()[:8]

	_, err := database.DB.Exec("INSERT INTO registration_tokens (id, token, created_by, status) VALUES ($1, $2, $3, 'unused')", id, tokenStr, user.ID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":    id,
		"token": tokenStr,
	})
}

func (h *AuthHandler) DeleteRegistrationToken(c *gin.Context) {
	id := c.Param("id")
	_, err := database.DB.Exec("DELETE FROM registration_tokens WHERE id = $1", id)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Token deleted", nil)
}

func (h *AuthHandler) TestTime(c *gin.Context) {
	ranges := utils.GetWIBDateRanges()
	c.JSON(http.StatusOK, gin.H{
		"server_time_wib": utils.NowWIB().Format("2006-01-02 15:04:05"),
		"ranges":          ranges,
	})
}

func (h *AuthHandler) TestTransactions(c *gin.Context) {
	var count int
	_ = database.DB.Get(&count, "SELECT COUNT(*) FROM transactions")
	c.JSON(http.StatusOK, gin.H{
		"transaction_count": count,
	})
}
