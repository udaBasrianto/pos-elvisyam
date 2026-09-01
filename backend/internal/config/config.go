package config

import (
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	DBHost       string
	DBPort       string
	DBUser       string
	DBPassword   string
	DBName       string
	DBSSL        string
	DatabaseURL  string
	JWTSecret    string
	OTPEnabled   bool
	AdminOTPOnly bool
	UploadsDir   string
}

var AppConfig *Config

func LoadConfig() *Config {
	// Try loading .env from executable dir, current dir, or parent dirs
	if execPath, err := os.Executable(); err == nil {
		execDir := filepath.Dir(execPath)
		_ = godotenv.Load(filepath.Join(execDir, ".env"))
	}
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("backend/.env")

	port := getEnv("PORT", "5000")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPass := getEnv("DB_PASSWORD", getEnv("DB_PASS", "postgres"))
	dbName := getEnv("DB_NAME", "pos_db")
	dbSSL := getEnv("DB_SSL", "disable")
	jwtSecret := getEnv("JWT_SECRET", "default_pos_jwt_secret_key_1234567890")
	dbURL := os.Getenv("DATABASE_URL")

	otpEnabled := os.Getenv("OTP_ENABLED") == "true"
	adminOtpOnly := os.Getenv("ADMIN_OTP_ONLY") == "true"

	// Detect standard uploads directory
	uploadsDirCandidates := []string{
		"/www/wwwroot/posh.web.id/uploads",
		"/www/wwwroot/tokoryo.web.id/uploads",
		"/www/wwwroot/pos-app/uploads",
		"../uploads",
		"./uploads",
		"uploads",
	}
	if execPath, err := os.Executable(); err == nil {
		execDir := filepath.Dir(execPath)
		uploadsDirCandidates = append(uploadsDirCandidates, 
			filepath.Join(execDir, "uploads"),
			filepath.Join(execDir, "../uploads"),
		)
	}

	var uploadsDir string
	if custom := os.Getenv("UPLOADS_DIR"); custom != "" {
		uploadsDir = custom
	} else {
		for _, d := range uploadsDirCandidates {
			if fi, err := os.Stat(d); err == nil && fi.IsDir() {
				uploadsDir = d
				break
			}
		}
		if uploadsDir == "" {
			uploadsDir = "./uploads"
		}
	}
	if !filepath.IsAbs(uploadsDir) {
		if absPath, err := filepath.Abs(uploadsDir); err == nil {
			uploadsDir = absPath
		}
	}
	_ = os.MkdirAll(uploadsDir, 0777)

	AppConfig = &Config{
		Port:         port,
		DBHost:       dbHost,
		DBPort:       dbPort,
		DBUser:       dbUser,
		DBPassword:   dbPass,
		DBName:       dbName,
		DBSSL:        dbSSL,
		DatabaseURL:  dbURL,
		JWTSecret:    jwtSecret,
		OTPEnabled:   otpEnabled,
		AdminOTPOnly: adminOtpOnly,
		UploadsDir:   uploadsDir,
	}

	return AppConfig
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
