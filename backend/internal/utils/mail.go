package utils

import (
	"crypto/tls"
	"log"
	"os"
	"strconv"

	"backend/internal/database"

	"gopkg.in/gomail.v2"
)

type SMTPOptions struct {
	Host   string `db:"smtp_host"`
	Port   int    `db:"smtp_port"`
	User   string `db:"smtp_user"`
	Pass   string `db:"smtp_pass"`
	Secure bool   `db:"smtp_secure"`
}

func SendEmail(to, subject, htmlBody string) error {
	var opt SMTPOptions

	err := database.DB.Get(&opt, `
		SELECT 
			COALESCE(NULLIF(smtp_host, ''), 'smtp.gmail.com') as smtp_host,
			COALESCE(NULLIF(smtp_port::text, '')::int, 465) as smtp_port,
			COALESCE(smtp_user, '') as smtp_user,
			COALESCE(smtp_pass, '') as smtp_pass,
			COALESCE(smtp_secure, true) as smtp_secure
		FROM smtp_settings
		LIMIT 1
	`)
	if err != nil || opt.User == "" || opt.Pass == "" {
		port, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))
		if port == 0 {
			port = 465
		}
		opt = SMTPOptions{
			Host:   os.Getenv("SMTP_HOST"),
			Port:   port,
			User:   os.Getenv("SMTP_USER"),
			Pass:   os.Getenv("SMTP_PASS"),
			Secure: os.Getenv("SMTP_SECURE") != "false",
		}
	}

	if opt.Host == "" {
		opt.Host = "smtp.gmail.com"
	}
	if opt.Port == 0 {
		opt.Port = 465
	}
	if opt.User == "" || opt.Pass == "" {
		log.Printf("SMTP credentials not configured. Skipping sending email to %s", to)
		return nil
	}

	m := gomail.NewMessage()
	m.SetHeader("From", opt.User)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", htmlBody)

	d := gomail.NewDialer(opt.Host, opt.Port, opt.User, opt.Pass)
	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}

	return d.DialAndSend(m)
}
