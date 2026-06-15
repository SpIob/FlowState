use portable_pty::{Child, MasterPty};
use sqlx::SqlitePool;
use std::io::Write;
use std::sync::Mutex;

/// Holds the spawned shell process and PTY handles for terminal I/O.
pub struct AppState {
    /// The master PTY handle, used primarily for resizing the terminal window.
    pub pty_master: Mutex<Option<Box<dyn MasterPty + Send>>>,
    /// The writable handle to the PTY, used for sending user input to the shell.
    pub pty_writer: Mutex<Option<Box<dyn Write + Send>>>,
    /// The child process handle.
    pub pty_child: Mutex<Option<Box<dyn Child + Send>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            pty_master: Mutex::new(None),
            pty_writer: Mutex::new(None),
            pty_child: Mutex::new(None),
        }
    }
}

/// Holds the SQLite connection pool for database operations.
pub struct DbState {
    pub pool: SqlitePool,
}