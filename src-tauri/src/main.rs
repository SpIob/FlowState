// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // 'flowstate_lib' assumes your Cargo.toml defines the library name as such.
    // If your Cargo.toml has a different crate name (e.g., `app_lib`), update this import accordingly.
    flowstate_lib::run();
}