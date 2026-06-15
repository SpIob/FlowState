use crate::state::DbState;
use tauri::State;

/// No-op at runtime — migrations run on startup via sqlx in lib.rs.
/// Exists so the frontend can call it as a readiness check.
#[tauri::command]
pub async fn initialize_db() -> Result<(), String> {
    Ok(())
}

/// Upsert a key-value pair into app_state.
#[tauri::command]
pub async fn save_app_state(
    key: String,
    value: String,
    db: State<'_, DbState>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO app_state (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(&key)
    .bind(&value)
    .execute(&db.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Load a value by key from app_state. Returns None if not found.
#[tauri::command]
pub async fn load_app_state(
    key: String,
    db: State<'_, DbState>,
) -> Result<Option<String>, String> {
    let row: Option<(String,)> =
        sqlx::query_as("SELECT value FROM app_state WHERE key = ?1")
            .bind(&key)
            .fetch_optional(&db.pool)
            .await
            .map_err(|e| e.to_string())?;
    Ok(row.map(|(v,)| v))
}