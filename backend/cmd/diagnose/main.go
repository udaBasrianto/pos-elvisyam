package main

import (
	"fmt"
	"log"
	"os"

	"backend/internal/database"

	"github.com/joho/godotenv"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func main() {
	fmt.Println("=========================================================")
	fmt.Println("🔍 POSH PostgreSQL Database Diagnostic Tool")
	fmt.Println("=========================================================")

	// 1. Load .env
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("backend/.env")

	dbHost := getEnv("DB_HOST", "127.0.0.1")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPass := getEnv("DB_PASSWORD", getEnv("DB_PASS", "postgres"))
	dbName := getEnv("DB_NAME", "pos_db")
	dbSSL := getEnv("DB_SSL", "disable")

	fmt.Printf("📌 Config: Host=%s, Port=%s, User=%s, DB=%s, SSL=%s\n", dbHost, dbPort, dbUser, dbName, dbSSL)

	// 2. Connect
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPass, dbName, dbSSL)

	db, err := sqlx.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("❌ sqlx.Open failed: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		fmt.Printf("\n❌ DATABASE PING FAILED: %v\n", err)
		fmt.Println("👉 Periksa apakah nama database, user, atau password di .env sudah benar di PostgreSQL aaPanel.")
		return
	}
	fmt.Println("✅ Connected to PostgreSQL successfully!")

	// Run AutoMigrate if tables don't exist
	fmt.Println("⚙️ Running AutoMigrate to ensure all 21 POS tables & demo seeds are ready...")
	if err := database.AutoMigrate(db); err != nil {
		fmt.Printf("⚠️ AutoMigrate note: %v\n", err)
	} else {
		fmt.Println("✅ AutoMigrate completed successfully!")
	}

	// 3. Check Tables
	var tables []string
	err = db.Select(&tables, `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public'
		ORDER BY table_name ASC
	`)
	if err != nil {
		fmt.Printf("❌ Failed to query tables: %v\n", err)
		return
	}
	fmt.Printf("\n📋 Total Tables Found: %d\n", len(tables))
	for _, t := range tables {
		var count int
		_ = db.Get(&count, fmt.Sprintf("SELECT COUNT(*) FROM %s", t))
		fmt.Printf("   - %-25s (Rows: %d)\n", t, count)
	}

	// 4. Test Users table
	fmt.Println("\n👤 Inspecting 'users' table:")
	type UserRow struct {
		ID       string  `db:"id"`
		Email    string  `db:"email"`
		Role     string  `db:"role"`
		FullName *string `db:"full_name"`
	}
	var users []UserRow
	err = db.Select(&users, "SELECT id, email, role, full_name FROM users LIMIT 10")
	if err != nil {
		fmt.Printf("   ❌ Error querying users: %v\n", err)
	} else {
		for _, u := range users {
			fn := "-"
			if u.FullName != nil {
				fn = *u.FullName
			}
			fmt.Printf("   - ID: %s | Email: %s | Role: %s | Name: %s\n", u.ID, u.Email, u.Role, fn)
		}
	}

	// 5. Test Products query
	fmt.Println("\n📦 Testing Products query (GetProducts):")
	type ProdTest struct {
		ID    string  `db:"id"`
		Name  string  `db:"name"`
		Price float64 `db:"price"`
		Cost  float64 `db:"cost"`
		Stock int     `db:"stock"`
	}
	var prods []ProdTest
	err = db.Select(&prods, `
		SELECT id, name, COALESCE(price, 0)::float8 as price, COALESCE(cost, 0)::float8 as cost, COALESCE(stock, 0) as stock
		FROM products
		LIMIT 5
	`)
	if err != nil {
		fmt.Printf("   ❌ Products query error: %v\n", err)
	} else {
		fmt.Printf("   ✅ Successfully retrieved %d products.\n", len(prods))
		for _, p := range prods {
			fmt.Printf("   - %s (Price: %.0f, Cost: %.0f, Stock: %d)\n", p.Name, p.Price, p.Cost, p.Stock)
		}
	}

	fmt.Println("\n=========================================================")
	fmt.Println("✅ Diagnostic Complete!")
	fmt.Println("=========================================================")
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
