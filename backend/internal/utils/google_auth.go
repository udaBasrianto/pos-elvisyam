package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type GoogleTokenPayload struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Audience      string `json:"aud"`
	Error         string `json:"error"`
	ErrorDesc     string `json:"error_description"`
}

// VerifyGoogleIDToken verifies a Google OAuth ID token (credential) with Google's tokeninfo endpoint.
func VerifyGoogleIDToken(idToken string, expectedClientID string) (*GoogleTokenPayload, error) {
	cleanToken := strings.TrimSpace(idToken)
	if cleanToken == "" {
		return nil, errors.New("token credential Google tidak boleh kosong")
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	endpoint := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(cleanToken)
	resp, err := client.Get(endpoint)
	if err != nil {
		return nil, fmt.Errorf("gagal menghubungi server verifikasi Google: %w", err)
	}
	defer resp.Body.Close()

	var payload GoogleTokenPayload
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("gagal memproses respons dari Google: %w", err)
	}

	if resp.StatusCode != http.StatusOK || payload.Error != "" {
		desc := payload.ErrorDesc
		if desc == "" {
			desc = payload.Error
		}
		if desc == "" {
			desc = "token tidak valid atau sudah kedaluwarsa"
		}
		return nil, fmt.Errorf("verifikasi Google gagal: %s", desc)
	}

	if strings.TrimSpace(payload.Email) == "" {
		return nil, errors.New("akun Google tidak memiliki alamat email yang valid")
	}

	// Validate audience if expectedClientID is configured
	cleanExpected := strings.TrimSpace(expectedClientID)
	if cleanExpected != "" && payload.Audience != cleanExpected {
		return nil, fmt.Errorf("Client ID tidak cocok dengan konfigurasi sistem")
	}

	return &payload, nil
}
