package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestHandleLogin(t *testing.T) {
	// 1. Success case: admin / admin
	body, _ := json.Marshal(LoginRequest{Username: "admin", Password: "admin"})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	w := httptest.NewRecorder()

	handleLogin(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	cookies := resp.Cookies()
	var hasSession bool
	for _, c := range cookies {
		if c.Name == "sim_session" {
			hasSession = true
			if c.Value != sessionToken {
				t.Errorf("Expected cookie value %q, got %q", sessionToken, c.Value)
			}
			if !c.HttpOnly {
				t.Errorf("Expected HttpOnly cookie to be true")
			}
		}
	}
	if !hasSession {
		t.Errorf("Expected session cookie 'sim_session' to be set")
	}

	// 2. Failure case: wrong password
	bodyWrong, _ := json.Marshal(LoginRequest{Username: "admin", Password: "wrong"})
	reqWrong := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(bodyWrong))
	wWrong := httptest.NewRecorder()

	handleLogin(wWrong, reqWrong)

	respWrong := wWrong.Result()
	if respWrong.StatusCode != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %d", respWrong.StatusCode)
	}

	// 3. Method not allowed
	reqGet := httptest.NewRequest(http.MethodGet, "/api/auth/login", nil)
	wGet := httptest.NewRecorder()

	handleLogin(wGet, reqGet)

	respGet := wGet.Result()
	if respGet.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("Expected status 405, got %d", respGet.StatusCode)
	}

	// 4. Bad JSON
	reqBadJSON := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader([]byte("{bad-json}")))
	wBadJSON := httptest.NewRecorder()

	handleLogin(wBadJSON, reqBadJSON)

	respBadJSON := wBadJSON.Result()
	if respBadJSON.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", respBadJSON.StatusCode)
	}
}

func TestHandleLogout(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/auth/logout", nil)
	w := httptest.NewRecorder()

	handleLogout(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	cookies := resp.Cookies()
	var hasSession bool
	for _, c := range cookies {
		if c.Name == "sim_session" {
			hasSession = true
			if c.Value != "" {
				t.Errorf("Expected empty session cookie value, got %q", c.Value)
			}
			if c.MaxAge > 0 || (!c.Expires.IsZero() && c.Expires.After(time.Now())) {
				t.Errorf("Expected cookie to be expired, but got Expires: %v", c.Expires)
			}
		}
	}
	if !hasSession {
		t.Errorf("Expected session cookie 'sim_session' to be updated/cleared")
	}
}

func TestHandleAuthStatus(t *testing.T) {
	// 1. Unauthenticated state
	reqUnauth := httptest.NewRequest(http.MethodGet, "/api/auth/status", nil)
	wUnauth := httptest.NewRecorder()

	handleAuthStatus(wUnauth, reqUnauth)

	respUnauth := wUnauth.Result()
	if respUnauth.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", respUnauth.StatusCode)
	}

	var statusUnauth map[string]interface{}
	json.NewDecoder(respUnauth.Body).Decode(&statusUnauth)
	if statusUnauth["authenticated"] != false {
		t.Errorf("Expected authenticated: false, got %v", statusUnauth["authenticated"])
	}

	// 2. Authenticated state
	reqAuth := httptest.NewRequest(http.MethodGet, "/api/auth/status", nil)
	reqAuth.AddCookie(&http.Cookie{Name: "sim_session", Value: sessionToken})
	wAuth := httptest.NewRecorder()

	handleAuthStatus(wAuth, reqAuth)

	respAuth := wAuth.Result()
	if respAuth.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", respAuth.StatusCode)
	}

	var statusAuth map[string]interface{}
	json.NewDecoder(respAuth.Body).Decode(&statusAuth)
	if statusAuth["authenticated"] != true {
		t.Errorf("Expected authenticated: true, got %v", statusAuth["authenticated"])
	}
}

func TestRequireAuthMiddleware(t *testing.T) {
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	protectedHandler := requireAuth(dummyHandler)

	// 1. Unauthorised request (no cookie)
	reqUnauth := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	wUnauth := httptest.NewRecorder()

	protectedHandler.ServeHTTP(wUnauth, reqUnauth)

	respUnauth := wUnauth.Result()
	if respUnauth.StatusCode != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %d", respUnauth.StatusCode)
	}

	// 2. Authorised request (valid cookie)
	reqAuth := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	reqAuth.AddCookie(&http.Cookie{Name: "sim_session", Value: sessionToken})
	wAuth := httptest.NewRecorder()

	protectedHandler.ServeHTTP(wAuth, reqAuth)

	respAuth := wAuth.Result()
	if respAuth.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", respAuth.StatusCode)
	}
}
