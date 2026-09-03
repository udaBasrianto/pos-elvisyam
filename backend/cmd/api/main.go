package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/modules/admin"
	"backend/internal/modules/auth"
	"backend/internal/modules/enterprise"
	"backend/internal/modules/feedback"
	"backend/internal/modules/finance"
	"backend/internal/modules/inventory"
	"backend/internal/modules/master"
	"backend/internal/modules/pos"
	"backend/internal/modules/products"
	"backend/internal/modules/reports"
	"backend/internal/modules/store"

	"github.com/gin-gonic/gin"
)

func main() {
	// Set default timezone to Asia/Jakarta (WIB UTC+7)
	if loc, err := time.LoadLocation("Asia/Jakarta"); err == nil {
		time.Local = loc
	} else {
		time.Local = time.FixedZone("WIB", 7*3600)
	}

	// 1. Load configuration
	cfg := config.LoadConfig()

	// 2. Set Gin mode
	if os.Getenv("NODE_ENV") == "production" || os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 3. Connect to PostgreSQL
	_, err := database.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("❌ Database connection error: %v", err)
	}
	defer database.DB.Close()

	// 4. Run automatic schema migrations & seeds
	if err := database.AutoMigrate(database.DB); err != nil {
		log.Printf("⚠️ AutoMigrate note: %v", err)
	}

	// 5. Initialize Gin engine
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(gin.Logger())
	router.Use(middleware.CORSMiddleware())

	// 5. Serve static uploads (both /uploads and /api/uploads) with multi-directory fallback
	uploadsDir := cfg.UploadsDir
	if uploadsDir == "" {
		uploadsDir = "./uploads"
	}
	_ = os.MkdirAll(uploadsDir, 0777)

	serveUploads := func(c *gin.Context) {
		filename := filepath.Clean(c.Param("filepath"))
		// Check primary directory first
		primaryPath := filepath.Join(uploadsDir, filename)
		if fi, err := os.Stat(primaryPath); err == nil && !fi.IsDir() {
			c.File(primaryPath)
			return
		}
		// Check extra candidate directories from config (EXTRA_UPLOAD_DIRS env)
		for _, extra := range cfg.ExtraUploadDirs {
			extraPath := filepath.Join(extra, filename)
			if fi, err := os.Stat(extraPath); err == nil && !fi.IsDir() {
				c.File(extraPath)
				return
			}
		}
		// Fallback: check relative paths
		for _, extra := range []string{"./uploads", "../uploads"} {
			extraPath := filepath.Join(extra, filename)
			if fi, err := os.Stat(extraPath); err == nil && !fi.IsDir() {
				c.File(extraPath)
				return
			}
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
	}

	router.GET("/uploads/*filepath", serveUploads)
	router.GET("/api/uploads/*filepath", serveUploads)

	// 6. Detect and Serve frontend SPA (Single Page Application) from dist if present
	distDirs := []string{
		"./dist",
		"../dist",
		"/www/wwwroot/tokoryo.web.id/dist",
		"/www/wwwroot/pos.elvisyam.com/dist",
		"/www/wwwroot/hana/dist",
		"/www/wwwroot/pos-hana/dist",
		"/www/wwwroot/posh.web.id/dist",
		"/www/wwwroot/pos-app/dist",
	}
	var foundDist string
	for _, d := range distDirs {
		if fi, err := os.Stat(d); err == nil && fi.IsDir() {
			if _, errIndex := os.Stat(filepath.Join(d, "index.html")); errIndex == nil {
				foundDist = d
				break
			}
		}
	}

	if foundDist != "" {
		log.Printf("🌐 Serving Frontend SPA from: %s", foundDist)
		router.Static("/assets", filepath.Join(foundDist, "assets"))
		
		// Automatically serve all root files in dist (e.g. sw.js, workbox-*.js, favicon.ico, manifest.webmanifest, etc.)
		if entries, err := os.ReadDir(foundDist); err == nil {
			for _, entry := range entries {
				if !entry.IsDir() && entry.Name() != "index.html" {
					fileName := entry.Name()
					fullPath := filepath.Join(foundDist, fileName)
					router.StaticFile("/"+fileName, fullPath)
				}
			}
		}

		// Root GET serves index.html
		router.GET("/", func(c *gin.Context) {
			c.File(filepath.Join(foundDist, "index.html"))
		})
	} else {
		// Fallback root health status if dist is not attached
		router.GET("/", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":  "online",
				"name":    "POS POSH Backend (Go-Gin Engine)",
				"engine":  "Golang + Gin + PostgreSQL",
				"version": "2.0.0",
			})
		})
	}

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	diagnoseHandler := func(c *gin.Context) {
		report := gin.H{
			"db_host": cfg.DBHost,
			"db_port": cfg.DBPort,
			"db_user": cfg.DBUser,
			"db_name": cfg.DBName,
			"db_ssl":  cfg.DBSSL,
		}

		if err := database.DB.Ping(); err != nil {
			report["ping_status"] = "failed"
			report["ping_error"] = err.Error()
			c.JSON(http.StatusInternalServerError, report)
			return
		}
		report["ping_status"] = "connected"

		var tables []string
		_ = database.DB.Select(&tables, `
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_schema = 'public'
			ORDER BY table_name ASC
		`)
		report["tables_count"] = len(tables)
		report["tables"] = tables

		rowCounts := make(map[string]int)
		for _, t := range []string{"users", "products", "categories", "customers", "transactions", "suppliers", "brands", "company_assets"} {
			var count int
			if err := database.DB.Get(&count, fmt.Sprintf("SELECT COUNT(*) FROM %s", t)); err == nil {
				rowCounts[t] = count
			} else {
				rowCounts[t] = -1
			}
		}
		report["row_counts"] = rowCounts

		c.JSON(http.StatusOK, report)
	}

	// /diagnose: protected, requires super_admin role
	diagnoseMiddleware := []gin.HandlerFunc{
		middleware.AuthenticateToken(),
		middleware.RequireRole("super_admin"),
	}
	router.GET("/diagnose", append(diagnoseMiddleware, diagnoseHandler)...)
	router.GET("/api/diagnose", append(diagnoseMiddleware, diagnoseHandler)...)

	// 7. Register API Routes under both /api and root / for universal Nginx proxy compatibility
	registerAllRoutes := func(rg *gin.RouterGroup) {
		auth.NewAuthHandler().RegisterRoutes(rg)
		master.NewMasterHandler().RegisterRoutes(rg)
		products.NewProductsHandler().RegisterRoutes(rg)
		pos.NewPOSHandler().RegisterRoutes(rg)
		inventory.NewInventoryHandler().RegisterRoutes(rg)
		finance.NewFinanceHandler().RegisterRoutes(rg)
		reports.NewReportsHandler().RegisterRoutes(rg)
		store.NewStoreHandler().RegisterRoutes(rg)
		admin.NewAdminHandler().RegisterRoutes(rg)
		enterprise.NewEnterpriseHandler().RegisterRoutes(rg)
		feedback.NewFeedbackHandler().RegisterRoutes(rg)
	}

	registerAllRoutes(router.Group("/api"))
	registerAllRoutes(router.Group(""))

	// 8. SPA Fallback: Any unknown GET route that is not /api will serve index.html
	if foundDist != "" {
		router.NoRoute(func(c *gin.Context) {
			if c.Request.Method == "GET" && !strings.HasPrefix(c.Request.URL.Path, "/api") {
				c.File(filepath.Join(foundDist, "index.html"))
				return
			}
			c.JSON(http.StatusNotFound, gin.H{"error": "Endpoint not found"})
		})
	}

	// 9. Start HTTP Server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 POS Go-Gin Server running on port %s", cfg.Port)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}
