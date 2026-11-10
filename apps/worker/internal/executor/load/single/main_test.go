package single

import (
	"log"
	"os"
	"testing"
	"worker/internal/config"
)

func TestMain(m *testing.M) {
	if err := os.Setenv("OUTBOUND_ALLOW_PRIVATE_NETWORKS", "true"); err != nil {
		log.Fatal(err)
	}
	if err := config.Load(); err != nil {
		log.Fatal(err)
	}
	os.Exit(m.Run())
}
