package store

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresStore struct {
	pool *pgxpool.Pool
}

func NewPostgresStore(ctx context.Context, connString string) (*PostgresStore, error) {
	pool, err := pgxpool.New(ctx, connString)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	s := &PostgresStore{pool: pool}
	if err := s.createTable(ctx); err != nil {
		return nil, err
	}

	log.Println("connected to PostgreSQL")
	return s, nil
}

func (s *PostgresStore) createTable(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS workspace_updates (
			id SERIAL PRIMARY KEY,
			workspace_id TEXT NOT NULL,
			data BYTEA NOT NULL,
			created_at TIMESTAMP DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_workspace_id ON workspace_updates(workspace_id);
	`)
	if err != nil {
		return fmt.Errorf("unable to create table: %w", err)
	}
	return nil
}

func (s *PostgresStore) SaveUpdates(workspaceID string, updates [][]byte) error {
	ctx := context.Background()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("unable to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, update := range updates {
		_, err := tx.Exec(ctx,
			"INSERT INTO workspace_updates (workspace_id, data) VALUES ($1, $2)",
			workspaceID, update,
		)
		if err != nil {
			return fmt.Errorf("unable to insert update: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (s *PostgresStore) LoadUpdates(workspaceID string) ([][]byte, error) {
	ctx := context.Background()
	rows, err := s.pool.Query(ctx,
		"SELECT data FROM workspace_updates WHERE workspace_id = $1 ORDER BY id",
		workspaceID,
	)
	if err != nil {
		return nil, fmt.Errorf("unable to query updates: %w", err)
	}
	defer rows.Close()

	var updates [][]byte
	for rows.Next() {
		var data []byte
		if err := rows.Scan(&data); err != nil {
			return nil, fmt.Errorf("unable to scan row: %w", err)
		}
		updates = append(updates, data)
	}

	return updates, rows.Err()
}

func (s *PostgresStore) Close() {
	s.pool.Close()
}
