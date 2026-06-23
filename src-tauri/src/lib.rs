mod commands;
mod state;

use sqlx::sqlite::SqlitePoolOptions;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Migrations are run by tauri_plugin_sql for the JS side.
    // We also run them via sqlx for the Rust-side pool below.
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: "
            CREATE TABLE IF NOT EXISTS app_state (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at INTEGER NOT NULL,
                ended_at   INTEGER
            );
        ",
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:flowstate.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_data_dir)
                .expect("failed to create app data dir");

            let db_path = app_data_dir.join("flowstate.db");
            let db_url = format!("sqlite://{}?mode=rwc", db_path.display());

            // Build the pool synchronously inside setup using a temp runtime
            let pool = tauri::async_runtime::block_on(async {
                SqlitePoolOptions::new()
                    .max_connections(4)
                    .connect(&db_url)
                    .await
                    .expect("failed to connect to SQLite")
            });

            // Run migrations on the Rust-side pool
            tauri::async_runtime::block_on(async {
                sqlx::migrate!("../migrations")
                    .run(&pool)
                    .await
                    .expect("failed to run migrations");
            });

            app.manage(state::DbState { pool });
            app.manage(state::AppState::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::git::get_status,
            commands::git::get_log,
            commands::terminal::spawn_shell,
            commands::terminal::write_to_shell,
            commands::terminal::resize_pty,
            commands::db::initialize_db,
            commands::db::save_app_state,
            commands::db::load_app_state,
            commands::ollama::list_models,
            commands::ollama::chat_stream,
            commands::ollama::complete_code,
            commands::ollama::check_ollama,
            commands::signals::record_signal,
            commands::cognitive_score::get_scoring_weights,
            commands::cognitive_score::update_scoring_weights,
            commands::cognitive_score::compute_cognitive_score,
            #[cfg(target_os = "macos")]
            commands::focus_macos::trigger_focus_mode,
            #[cfg(target_os = "macos")]
            commands::focus_macos::check_shortcut_exists,
            #[cfg(target_os = "windows")]
            commands::focus_windows::trigger_focus_mode,
            #[cfg(target_os = "windows")]
            commands::focus_windows::check_shortcut_exists,
            commands::git_ops::stage_file,
            commands::git_ops::unstage_file,
            commands::git_ops::get_diff,
            commands::git_ops::create_branch,
            commands::git_ops::checkout_branch,
            commands::git_ops::merge_branch,
            commands::git_ops::fetch_remote,
            commands::git_ops::pull_remote,
            commands::git_ops::push_remote,
            commands::git_ops::commit,
            commands::git_ops::init_repo,
            commands::git_ops::list_branches,
            commands::git_ops::delete_branch,
            commands::git_ops::list_remotes,
            commands::git_ops::add_remote,
            commands::git_ops::remove_remote,
            commands::git_ops::get_origin_info,
            commands::fs::read_directory,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::check_path_exists,
            commands::fs::create_file,
            commands::fs::create_dir,
            commands::fs::rename_path,
            commands::fs::delete_path,
            commands::fs::list_workspace_files,
            commands::terminal::kill_shell,
            commands::db_viewer::list_tables,
            commands::db_viewer::get_schema,
            commands::db_viewer::query_data,
            commands::db_viewer::run_readonly_query,
            commands::github_ci::list_workflow_runs,
            commands::github_ci::get_workflow_jobs,
            commands::github_ci::get_job_logs,
            commands::plugin_runtime::register_plugin,
            commands::plugin_runtime::list_installed_plugins,
            commands::plugin_runtime::grant_permission,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}