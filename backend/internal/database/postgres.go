package database

import (
	"fmt"
	"log"
	"time"

	"backend/internal/config"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var DB *sqlx.DB

func ConnectDB(cfg *config.Config) (*sqlx.DB, error) {
	var dsn string
	if cfg.DatabaseURL != "" {
		dsn = cfg.DatabaseURL
	} else {
		sslmode := "disable"
		if cfg.DBSSL == "true" || cfg.DBSSL == "require" {
			sslmode = "require"
		}
		dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, sslmode)
	}

	db, err := sqlx.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Optimize connection pooling for low memory and high throughput
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(10 * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Printf("⚠️ Database connection ping warning: %v (will retry on queries)", err)
	} else {
		log.Println("✅ Connected to PostgreSQL database successfully")
	}

	DB = db
	return db, nil
}
