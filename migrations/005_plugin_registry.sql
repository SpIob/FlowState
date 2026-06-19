-- migrations/005_plugin_registry.sql
CREATE TABLE IF NOT EXISTS plugins (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    version      TEXT NOT NULL,
    entry_point  TEXT NOT NULL,
    permissions  TEXT NOT NULL DEFAULT '[]', -- JSON array of granted scopes
    enabled      INTEGER NOT NULL DEFAULT 1,
    installed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plugin_audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id   TEXT NOT NULL,
    permission  TEXT NOT NULL,
    granted     INTEGER NOT NULL,
    timestamp   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_plugin ON plugin_audit_log(plugin_id);