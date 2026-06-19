-- FILE 1: migrations/004_cognitive_state.sql
CREATE TABLE IF NOT EXISTS scoring_weights (
    id               INTEGER PRIMARY KEY CHECK (id = 1),
    pause_proportion REAL NOT NULL DEFAULT 0.4,
    iki_variance     REAL NOT NULL DEFAULT 0.25,
    backspace_latency REAL NOT NULL DEFAULT 0.20,
    focus_duration   REAL NOT NULL DEFAULT 0.15,
    iki_baseline     REAL NOT NULL DEFAULT 0.1,
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO scoring_weights (id) VALUES (1);

CREATE TABLE IF NOT EXISTS score_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    score       REAL NOT NULL,
    signals_json TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_score_history_created ON score_history(created_at);