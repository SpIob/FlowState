-- migrations/002_ai_chat.sql
CREATE TABLE IF NOT EXISTS chat_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    model      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session
    ON chat_messages(session_id);