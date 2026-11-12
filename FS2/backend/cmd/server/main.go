package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/rs/cors"
	"github.com/sevladev/real-time-collaborative-editor/backend/internal/store"
	"github.com/sevladev/real-time-collaborative-editor/backend/internal/ws"
)

func main() {
	ctx := context.Background()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://collab:collab@localhost:5432/collab_editor?sslmode=disable"
	}

	pgStore, err := store.NewPostgresStore(ctx, dbURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pgStore.Close()

	roomManager := ws.NewRoomManager(pgStore)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /ws/{workspaceId}", ws.HandleWebSocket(roomManager))

	mux.HandleFunc("POST /api/workspaces", func(w http.ResponseWriter, r *http.Request) {
		workspaceID := uuid.New().String()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id":"` + workspaceID + `"}`))
	})

	mux.HandleFunc("GET /api/workspaces/{id}", func(w http.ResponseWriter, r *http.Request) {
		workspaceID := r.PathValue("id")
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"id":"` + workspaceID + `"}`))
	})

	handler := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
	}).Handler(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: handler,
	}

	// TODO: periodic flush for active rooms
	flushTicker := time.NewTicker(5 * time.Second)
	go func() {
		for range flushTicker.C {
			roomManager.FlushAll()
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("server starting on :%s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-quit
	log.Println("shutting down server...")

	flushTicker.Stop()
	roomManager.FlushAll()

	shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("server forced to shutdown: %v", err)
	}

	log.Println("server stopped")
}
