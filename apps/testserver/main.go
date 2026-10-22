package main

import (
	"log"
	"net/http"
	"time"
)

const addr = ":8080"

func main() {
	cfg, err := loadConfig()
	if err != nil {
		log.Fatalf("invalid configuration: %v", err)
	}

	server := &http.Server{
		Addr:              addr,
		Handler:           newHandler(newTraffic(cfg.stallEvery, cfg.stallFor)),
		ReadHeaderTimeout: 10 * time.Second,
	}

	if cfg.stallEvery > 0 {
		log.Printf("stall mode: at the end of every %s the server freezes for %s", cfg.stallEvery, cfg.stallFor)
	}
	log.Printf("test server listening on %s", addr)
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func newHandler(traffic *traffic) http.Handler {
	sessions := newSessions()
	tasks := newTaskStore()
	users := newUserStore()

	mux := http.NewServeMux()

	mux.HandleFunc("GET /fixed", handleFixed)
	mux.HandleFunc("GET /status/{code}", handleStatus)
	mux.HandleFunc("GET /flaky", handleFlaky)

	mux.HandleFunc("POST /auth/login", sessions.handleLogin)
	mux.Handle("POST /tasks", sessions.requireAuth(tasks.handleCreate))
	mux.Handle("GET /tasks/{id}", sessions.requireAuth(tasks.handleGet))
	mux.Handle("PATCH /tasks/{id}", sessions.requireAuth(tasks.handleUpdate))
	mux.Handle("DELETE /tasks/{id}", sessions.requireAuth(tasks.handleDelete))

	mux.HandleFunc("POST /users", users.handleCreate)

	mux.HandleFunc("GET /admin/stats", traffic.handleStats)
	mux.HandleFunc("POST /admin/reset", traffic.handleReset)
	mux.HandleFunc("GET /openapi.yaml", handleOpenAPI)

	return traffic.middleware(mux)
}
