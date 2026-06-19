// src-tauri/src/commands/plugin_runtime.rs
use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqlitePoolOptions;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub entry_point: String,
    pub permissions: Vec<String>,
    pub description: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PluginRecord {
    pub id: String,
    pub name: String,
    pub version: String,
    pub entry_point: String,
    pub permissions: Vec<String>,
    pub enabled: bool,
}

async fn get_pool(app: &AppHandle) -> Result<sqlx::SqlitePool, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("sqlite.db"); 
    
    let path = if !db_path.exists() {
        let alt_path = app_dir.join("flowstate.db");
        if alt_path.exists() { alt_path } else { db_path }
    } else {
        db_path
    };

    SqlitePoolOptions::new()
        .connect(&format!("sqlite://{}?mode=rwc", path.to_string_lossy()))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn register_plugin(app: AppHandle, manifest_json: String) -> Result<PluginRecord, String> {
    let manifest: PluginManifest = serde_json::from_str(&manifest_json).map_err(|e| format!("Invalid manifest JSON: {}", e))?;
    
    // Basic semver validation
    if manifest.version.split('.').count() != 3 {
        return Err("Invalid semver format (expected x.y.z)".to_string());
    }

    let pool = get_pool(&app).await?;
    let perms_json = serde_json::to_string(&manifest.permissions).map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT OR REPLACE INTO plugins (id, name, version, entry_point, permissions, enabled) VALUES (?, ?, ?, ?, ?, 1)"
    )
    .bind(&manifest.id)
    .bind(&manifest.name)
    .bind(&manifest.version)
    .bind(&manifest.entry_point)
    .bind(&perms_json)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(PluginRecord {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        entry_point: manifest.entry_point,
        permissions: manifest.permissions,
        enabled: true,
    })
}

#[tauri::command]
pub async fn list_installed_plugins(app: AppHandle) -> Result<Vec<PluginRecord>, String> {
    let pool = get_pool(&app).await?;
    
    let rows: Vec<(String, String, String, String, String, i32)> = sqlx::query_as(
        "SELECT id, name, version, entry_point, permissions, enabled FROM plugins"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut records = Vec::new();
    for (id, name, version, entry_point, perms_json, enabled) in rows {
        let permissions: Vec<String> = serde_json::from_str(&perms_json).unwrap_or_default();
        records.push(PluginRecord {
            id, name, version, entry_point, permissions, enabled: enabled == 1,
        });
    }
    Ok(records)
}

#[tauri::command]
pub async fn grant_permission(app: AppHandle, plugin_id: String, permission: String) -> Result<(), String> {
    let pool = get_pool(&app).await?;
    
    // 1. Log the grant to the immutable audit trail
    sqlx::query("INSERT INTO plugin_audit_log (plugin_id, permission, granted) VALUES (?, ?, 1)")
        .bind(&plugin_id)
        .bind(&permission)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    // 2. Update the plugin's active permissions array
    let row: (String,) = sqlx::query_as("SELECT permissions FROM plugins WHERE id = ?")
        .bind(&plugin_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Plugin not found")?;

    let mut perms: Vec<String> = serde_json::from_str(&row.0).unwrap_or_default();
    if !perms.contains(&permission) {
        perms.push(permission);
        let new_perms_json = serde_json::to_string(&perms).map_err(|e| e.to_string())?;
        
        sqlx::query("UPDATE plugins SET permissions = ? WHERE id = ?")
            .bind(&new_perms_json)
            .bind(&plugin_id)
            .execute(&pool)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}