package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
)

const maxSessions = 100_000

type sessions struct {
	tokens *boundedMap[string, string]
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	AccessToken string `json:"accessToken"`
	TokenType   string `json:"tokenType"`
}

type ownerKey struct{}

func newSessions() *sessions {
	return &sessions{tokens: newBoundedMap[string, string](maxSessions)}
}

func (s *sessions) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if !readJSON(w, r, &req) {
		return
	}
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusUnauthorized, "email and password are required")
		return
	}

	token := newToken()
	s.tokens.Add(token, req.Email)
	writeJSON(w, http.StatusOK, loginResponse{AccessToken: token, TokenType: "Bearer"})
}

func (s *sessions) requireAuth(next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok {
			writeError(w, http.StatusUnauthorized, "missing bearer token")
			return
		}
		owner, ok := s.tokens.Get(token)
		if !ok {
			writeError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), ownerKey{}, owner)))
	})
}

func ownerFrom(r *http.Request) string {
	owner, _ := r.Context().Value(ownerKey{}).(string)
	return owner
}

func newToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
