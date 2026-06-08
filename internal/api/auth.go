package api

import (
	"encoding/json"
	"net/http"
	"time"
)

// LoginRequest defines credentials payload.
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

const sessionToken = "sim-secure-session-token-xyz"

// handleLogin validates credentials and sets session cookie.
func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz JSON"})
		return
	}

	if req.Username == "admin" && req.Password == "admin" {
		cookie := &http.Cookie{
			Name:     "sim_session",
			Value:    sessionToken,
			Path:     "/",
			Expires:  time.Now().Add(24 * time.Hour),
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		}
		http.SetCookie(w, cookie)
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	} else {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Kullanıcı adı veya şifre hatalı!"})
	}
}

// handleLogout clears the session cookie.
func handleLogout(w http.ResponseWriter, r *http.Request) {
	cookie := &http.Cookie{
		Name:     "sim_session",
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
	}
	http.SetCookie(w, cookie)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// handleAuthStatus returns whether the request has a valid session.
func handleAuthStatus(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("sim_session")
	if err == nil && cookie.Value == sessionToken {
		writeJSON(w, http.StatusOK, map[string]bool{"authenticated": true})
	} else {
		writeJSON(w, http.StatusOK, map[string]bool{"authenticated": false})
	}
}

// requireAuth protects routes by verifying session cookie.
func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("sim_session")
		if err == nil && cookie.Value == sessionToken {
			next(w, r)
			return
		}
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}
}
