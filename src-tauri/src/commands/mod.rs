// FILE 5: src-tauri/src/commands/mod.rs
pub mod git;
pub mod terminal;
pub mod db;
pub mod ollama;
pub mod signals;
pub mod cognitive_score;

#[cfg(target_os = "macos")]
pub mod focus_macos;

#[cfg(target_os = "windows")]
pub mod focus_windows;