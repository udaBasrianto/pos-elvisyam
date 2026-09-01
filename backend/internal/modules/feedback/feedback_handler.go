package feedback

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"backend/internal/database"
	"backend/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type FeedbackHandler struct{}

func NewFeedbackHandler() *FeedbackHandler {
	return &FeedbackHandler{}
}

func (h *FeedbackHandler) RegisterRoutes(r *gin.RouterGroup) {
	// Tenant Feature Requests & Upvotes
	fr := r.Group("/feature-requests", middleware.AuthenticateToken())
	{
		fr.GET("", h.GetFeatureRequests)
		fr.POST("", h.CreateFeatureRequest)
		fr.POST("/:id/upvote", h.ToggleUpvote)
		fr.DELETE("/:id", h.DeleteFeatureRequest)
	}

	// Super Admin Feature Request Management
	adminFr := r.Group("/admin/feature-requests", middleware.AuthenticateToken(), middleware.RequireRole("super_admin"))
	{
		adminFr.GET("", h.GetAdminFeatureRequests)
		adminFr.PATCH("/:id", h.UpdateFeatureRequestStatus)
		adminFr.DELETE("/:id", h.DeleteFeatureRequest)
	}
}

type FeatureRequest struct {
	ID           string    `json:"id" db:"id"`
	UserID       string    `json:"userId" db:"user_id"`
	TenantID     *string   `json:"tenantId" db:"tenant_id"`
	UserEmail    *string   `json:"userEmail" db:"user_email"`
	BusinessName *string   `json:"businessName" db:"business_name"`
	Title        string    `json:"title" db:"title"`
	Category     string    `json:"category" db:"category"`
	Priority     string    `json:"priority" db:"priority"`
	Description  string    `json:"description" db:"description"`
	ImageURL     *string   `json:"imageUrl" db:"image_url"`
	Status       string    `json:"status" db:"status"`
	AdminNotes   *string   `json:"adminNotes" db:"admin_notes"`
	UpvotesCount int       `json:"upvotesCount" db:"upvotes_count"`
	HasUpvoted   bool      `json:"hasUpvoted" db:"has_upvoted"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time `json:"updatedAt" db:"updated_at"`
}

type CreateFeatureRequestInput struct {
	Title       string  `json:"title" binding:"required"`
	Category    string  `json:"category"`
	Priority    string  `json:"priority"`
	Description string  `json:"description" binding:"required"`
	ImageURL    *string `json:"imageUrl"`
}

type UpdateStatusInput struct {
	Status     string  `json:"status"`
	AdminNotes *string `json:"adminNotes"`
}

// -------------------------------------------------------------
// TENANT & USER ENDPOINTS
// -------------------------------------------------------------

// GetFeatureRequests returns public / tenant feature requests with upvote status
func (h *FeedbackHandler) GetFeatureRequests(c *gin.Context) {
	currentUserID := c.GetString("userId")
	statusFilter := c.Query("status")
	categoryFilter := c.Query("category")
	mineOnly := c.Query("mine") == "true"
	sortBy := c.DefaultQuery("sort", "popular") // "popular" or "newest"

	query := `
		SELECT 
			fr.id, fr.user_id, fr.tenant_id, fr.user_email, fr.business_name,
			fr.title, fr.category, fr.priority, fr.description, fr.image_url,
			fr.status, fr.admin_notes, fr.upvotes_count, fr.created_at, fr.updated_at,
			CASE WHEN fru.id IS NOT NULL THEN true ELSE false END as has_upvoted
		FROM feature_requests fr
		LEFT JOIN feature_request_upvotes fru 
			ON fru.feature_request_id = fr.id AND fru.user_id = $1
		WHERE 1=1
	`
	args := []interface{}{currentUserID}
	argIndex := 2

	if statusFilter != "" && statusFilter != "all" {
		query += fmt.Sprintf(" AND fr.status = $%d", argIndex)
		args = append(args, statusFilter)
		argIndex++
	}

	if categoryFilter != "" && categoryFilter != "all" {
		query += fmt.Sprintf(" AND fr.category = $%d", argIndex)
		args = append(args, categoryFilter)
		argIndex++
	}

	if mineOnly {
		query += fmt.Sprintf(" AND fr.user_id = $%d", argIndex)
		args = append(args, currentUserID)
		argIndex++
	}

	if sortBy == "newest" {
		query += ` ORDER BY fr.created_at DESC`
	} else {
		query += ` ORDER BY fr.upvotes_count DESC, fr.created_at DESC`
	}

	var requests []FeatureRequest
	err := database.DB.Select(&requests, query, args...)
	if err != nil && err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load feature requests: " + err.Error()})
		return
	}
	if requests == nil {
		requests = []FeatureRequest{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    requests,
	})
}

// CreateFeatureRequest allows tenant to submit a new feature request
func (h *FeedbackHandler) CreateFeatureRequest(c *gin.Context) {
	currentUserID := c.GetString("userId")
	userEmail := c.GetString("userEmail")
	tenantID := c.GetString("tenantId")

	var input CreateFeatureRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Judul dan deskripsi request wajib diisi."})
		return
	}

	if input.Category == "" {
		input.Category = "general"
	}
	if input.Priority == "" {
		input.Priority = "medium"
	}

	// Fetch business name from settings if available
	var businessName string
	_ = database.DB.Get(&businessName, `
		SELECT COALESCE(NULLIF(business_name, ''), 'Toko') 
		FROM settings 
		WHERE user_id = $1 OR user_id = $2 
		LIMIT 1
	`, currentUserID, tenantID)
	if businessName == "" {
		businessName = userEmail
	}

	requestID := uuid.New().String()
	insertQuery := `
		INSERT INTO feature_requests (
			id, user_id, tenant_id, user_email, business_name,
			title, category, priority, description, image_url,
			status, admin_notes, upvotes_count, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			'pending', '', 1, NOW(), NOW()
		)
	`

	_, err := database.DB.Exec(insertQuery,
		requestID, currentUserID, tenantID, userEmail, businessName,
		strings.TrimSpace(input.Title), input.Category, input.Priority, strings.TrimSpace(input.Description), input.ImageURL,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan usulan fitur: " + err.Error()})
		return
	}

	// Creator automatically upvotes their own request
	upvoteID := uuid.New().String()
	_, _ = database.DB.Exec(`
		INSERT INTO feature_request_upvotes (id, feature_request_id, user_id, created_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT DO NOTHING
	`, upvoteID, requestID, currentUserID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Usulan fitur berhasil diajukan!",
		"id":      requestID,
	})
}

// ToggleUpvote toggles an upvote on a feature request
func (h *FeedbackHandler) ToggleUpvote(c *gin.Context) {
	currentUserID := c.GetString("userId")
	requestID := c.Param("id")

	var existsID string
	err := database.DB.Get(&existsID, `
		SELECT id FROM feature_request_upvotes 
		WHERE feature_request_id = $1 AND user_id = $2
	`, requestID, currentUserID)

	hasUpvoted := false
	if err == nil {
		// Already upvoted -> remove upvote
		_, _ = database.DB.Exec(`
			DELETE FROM feature_request_upvotes 
			WHERE feature_request_id = $1 AND user_id = $2
		`, requestID, currentUserID)
		hasUpvoted = false
	} else {
		// Not upvoted -> add upvote
		_, _ = database.DB.Exec(`
			INSERT INTO feature_request_upvotes (id, feature_request_id, user_id, created_at)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT DO NOTHING
		`, uuid.New().String(), requestID, currentUserID)
		hasUpvoted = true
	}

	// Recount upvotes
	var upvotesCount int
	_ = database.DB.Get(&upvotesCount, `
		SELECT COUNT(*) FROM feature_request_upvotes WHERE feature_request_id = $1
	`, requestID)

	_, _ = database.DB.Exec(`
		UPDATE feature_requests 
		SET upvotes_count = $1, updated_at = NOW() 
		WHERE id = $2
	`, upvotesCount, requestID)

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"hasUpvoted":   hasUpvoted,
		"upvotesCount": upvotesCount,
	})
}

// -------------------------------------------------------------
// SUPER ADMIN ENDPOINTS
// -------------------------------------------------------------

// GetAdminFeatureRequests returns all feature requests + stats for Super Admin
func (h *FeedbackHandler) GetAdminFeatureRequests(c *gin.Context) {
	query := `
		SELECT 
			fr.id, fr.user_id, fr.tenant_id, fr.user_email, fr.business_name,
			fr.title, fr.category, fr.priority, fr.description, fr.image_url,
			fr.status, fr.admin_notes, fr.upvotes_count, fr.created_at, fr.updated_at,
			false as has_upvoted
		FROM feature_requests fr
		ORDER BY 
			CASE 
				WHEN fr.status = 'pending' THEN 1
				WHEN fr.status = 'planned' THEN 2
				WHEN fr.status = 'in_progress' THEN 3
				WHEN fr.status = 'completed' THEN 4
				ELSE 5
			END,
			fr.upvotes_count DESC,
			fr.created_at DESC
	`

	var requests []FeatureRequest
	err := database.DB.Select(&requests, query)
	if err != nil && err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load admin feature requests: " + err.Error()})
		return
	}
	if requests == nil {
		requests = []FeatureRequest{}
	}

	// Calculate stats
	var total, pending, planned, inProgress, completed, declined int
	for _, r := range requests {
		total++
		switch r.Status {
		case "pending":
			pending++
		case "planned":
			planned++
		case "in_progress":
			inProgress++
		case "completed":
			completed++
		case "declined", "rejected":
			declined++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    requests,
		"stats": gin.H{
			"total":      total,
			"pending":    pending,
			"planned":    planned,
			"inProgress": inProgress,
			"completed":  completed,
			"declined":   declined,
		},
	})
}

// UpdateFeatureRequestStatus allows Super Admin to change status and write response notes
func (h *FeedbackHandler) UpdateFeatureRequestStatus(c *gin.Context) {
	requestID := c.Param("id")

	var input UpdateStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
		return
	}

	query := `
		UPDATE feature_requests 
		SET status = COALESCE(NULLIF($1, ''), status),
		    admin_notes = COALESCE($2, admin_notes),
		    updated_at = NOW()
		WHERE id = $3
	`

	_, err := database.DB.Exec(query, input.Status, input.AdminNotes, requestID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengupdate status: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Status request berhasil diperbarui",
		"id":      requestID,
	})
}

// DeleteFeatureRequest deletes a feature request
func (h *FeedbackHandler) DeleteFeatureRequest(c *gin.Context) {
	requestID := c.Param("id")
	currentUserID := c.GetString("userId")
	userRole := c.GetString("role")

	var err error
	if userRole == "super_admin" {
		_, err = database.DB.Exec("DELETE FROM feature_requests WHERE id = $1", requestID)
	} else {
		// Tenant can only delete their own request if status is still pending
		_, err = database.DB.Exec("DELETE FROM feature_requests WHERE id = $1 AND user_id = $2 AND status = 'pending'", requestID, currentUserID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus request: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Usulan fitur berhasil dihapus",
		"id":      requestID,
	})
}
