package main

import (
	"log"
	"net/http"
)

const addr = ":8080"

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /fixed", handleFixed)

	log.Printf("test server listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
