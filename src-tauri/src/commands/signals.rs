use tauri::State;
use crate::state::DbState;

#[tauri::command]
pub async fn record_signal(
    event_type: String,
    payload: String,
    db: State<'_, DbState>,
) -> Result<(), String> {
    sqlx::query("INSERT INTO signal_events (event_type, payload) VALUES (?1, ?2)")
        .bind(event_type)
        .bind(payload)
        .execute(&db.pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}