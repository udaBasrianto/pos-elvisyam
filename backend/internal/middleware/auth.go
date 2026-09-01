package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type AuthUser struct {
	ID       string `json:"id" db:"id"`
	Email    string `json:"email" db:"email"`
	FullName string `json:"full_name" db:"full_name"`
	Role     string `json:"role" db:"role"`
	TenantID string `json:"tenant_id" db:"tenant_id"`
	ShopSlug string `json:"shop_slug" db:"shop_slug"`
}

type AuthCustomer struct {
	ID       string `json:"id" db:"id"`
	Email    string `json:"email" db:"email"`
	Name     string `json:"name" db:"name"`
	TenantID string `json:"tenant_id" db:"tenant_id"`
}

func AuthenticateToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token format invalid"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims := &utils.JWTClaims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(config.AppConfig.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		tenantID := claims.TenantID
		if tenantID == "" {
			tenantID = claims.ID
		}

		// Check user in DB to ensure user is active and get latest data
		var user AuthUser
		err = database.DB.Get(&user, "SELECT id, email, full_name, role, COALESCE(tenant_id, id) as tenant_id, COALESCE(shop_slug, '') as shop_slug FROM users WHERE id = $1", claims.ID)
		if err != nil {
			// Fallback to claims if db read has issues
			user = AuthUser{
				ID:       claims.ID,
				Email:    claims.Email,
				Role:     claims.Role,
				TenantID: tenantID,
			}
		}

		c.Set("user", user)
		c.Set("userId", user.ID)
		c.Set("userRole", user.Role)
		c.Set("tenantId", user.TenantID)
		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userVal, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
		user := userVal.(AuthUser)
		userRole := strings.ToLower(strings.TrimSpace(user.Role))

		if userRole == "super_admin" || userRole == "superadmin" || userRole == "owner" || userRole == "admin" {
			c.Next()
			return
		}

		for _, r := range roles {
			if userRole == strings.ToLower(strings.TrimSpace(r)) {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied. Required role: " + strings.Join(roles, " or "),
		})
		c.Abort()
	}
}

func CheckPermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userVal, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
		user := userVal.(AuthUser)

		if user.Role == "super_admin" || user.Role == "admin" {
			c.Next()
			return
		}

		// Check permissions table
		var permCount int
		err := database.DB.Get(&permCount, `
			SELECT COUNT(p.id)
			FROM permissions p
			JOIN role_permissions rp ON p.id = rp.permission_id
			JOIN user_roles ur ON rp.role_id = ur.role_id
			WHERE ur.user_id = $1 AND p.name = $2
		`, user.ID, permission)

		if err == nil && permCount > 0 {
			c.Next()
			return
		}

		// Fallback role check
		kasirAllowed := map[string]bool{
			"pos.view": true, "pos.create": true, "transactions.view": true, "transactions.create": true,
			"products.view": true, "customers.view": true, "customers.create": true,
			"shifts.view": true, "shifts.create": true,
		}
		managerAllowed := map[string]bool{
			"pos.view": true, "pos.create": true, "transactions.view": true, "transactions.create": true,
			"products.view": true, "products.create": true, "products.edit": true,
			"categories.view": true, "categories.create": true, "customers.view": true, "customers.create": true,
			"shifts.view": true, "shifts.create": true, "reports.view": true, "dashboard.view": true,
			"inventory.view": true, "stock.view": true,
		}

		if user.Role == "manager" && managerAllowed[permission] {
			c.Next()
			return
		}
		if user.Role == "kasir" && kasirAllowed[permission] {
			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied: " + permission + " required"})
		c.Abort()
	}
}

func AuthenticateStoreCustomer() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Customer token required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Customer token format invalid"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims := &utils.StoreCustomerClaims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(config.AppConfig.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid or expired customer token"})
			c.Abort()
			return
		}

		c.Set("customer", AuthCustomer{
			ID:       claims.ID,
			Email:    claims.Email,
			Name:     claims.Name,
			TenantID: claims.TenantID,
		})
		c.Next()
	}
}
