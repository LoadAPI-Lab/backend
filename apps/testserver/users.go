package main

import (
	"net/http"
	"strings"
	"sync/atomic"
)

const maxUsers = 100_000

type user struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type userStore struct {
	byEmail *boundedMap[string, user]
	lastID  atomic.Int64
}

type createUserRequest struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

func newUserStore() *userStore {
	return &userStore{byEmail: newBoundedMap[string, user](maxUsers)}
}

func (s *userStore) handleCreate(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if !readJSON(w, r, &req) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if !strings.Contains(email, "@") {
		writeError(w, http.StatusBadRequest, "email is required and must contain @")
		return
	}

	u := user{ID: s.lastID.Add(1), Email: email, Name: req.Name}
	if !s.byEmail.Add(email, u) {
		writeError(w, http.StatusConflict, "user with this email already exists")
		return
	}
	writeJSON(w, http.StatusCreated, dataResponse{Data: u})
}
