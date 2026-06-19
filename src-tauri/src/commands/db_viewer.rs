// src-tauri/src/commands/db_viewer.rs
use tauri::{AppHandle, Manager};
use sqlx::sqlite::{SqlitePoolOptions, SqliteRow};
use sqlx::{Row, Column}; // FIX: Added Column trait to scope
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct TableInfo {
    pub name: String,
    pub row_count: i64,
}

#[derive(Serialize, Clone)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub total_count: i64,
}

async fn get_read_only_pool(app: &AppHandle) -> Result<sqlx::SqlitePool, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    
    // Note: tauri-plugin-sql typically names the database 'sqlite.db'.
    // If your app uses a different name (e.g., 'flowstate.db'), update this!
    let db_path = app_dir.join("sqlite.db"); 
    
    if !db_path.exists() {
        let alt_path = app_dir.join("flowstate.db");
        if alt_path.exists() {
            let pool = SqlitePoolOptions::new()
                // FIX: Removed .read_only(true) — mode=ro in the URL handles this
                .connect(&format!("sqlite://{}?mode=ro", alt_path.to_string_lossy()))
                .await
                .map_err(|e| e.to_string())?;
            return Ok(pool);
        }
        return Err(format!("Database file not found at {:?}", db_path));
    }

    let pool = SqlitePoolOptions::new()
        // FIX: Removed .read_only(true)
        .connect(&format!("sqlite://{}?mode=ro", db_path.to_string_lossy()))
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(pool)
}

#[tauri::command]
pub async fn list_tables(app: AppHandle) -> Result<Vec<TableInfo>, String> {
    let pool = get_read_only_pool(&app).await?;
    
    let tables: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for table in tables {
        let count_query = format!("SELECT COUNT(*) FROM \"{}\"", table.replace("\"", "\"\""));
        let count: i64 = sqlx::query_scalar(&count_query)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);
            
        result.push(TableInfo {
            name: table,
            row_count: count,
        });
    }
    
    Ok(result)
}

#[tauri::command]
pub async fn get_schema(app: AppHandle, table: String) -> Result<String, String> {
    let pool = get_read_only_pool(&app).await?;
    
    let schema: String = sqlx::query_scalar(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name = ?;"
    )
    .bind(&table)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?
    .unwrap_or_else(|| "-- Schema not found".to_string());
    
    Ok(schema)
}

#[tauri::command]
pub async fn query_data(
    app: AppHandle,
    table: String,
    limit: i32,
    offset: i32,
    sort_by: Option<String>,
    filter: Option<String>,
) -> Result<QueryResult, String> {
    let pool = get_read_only_pool(&app).await?;
    
    // 1. Whitelist table name to prevent injection
    let tables: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master WHERE type='table';"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;
    
    if !tables.contains(&table) {
        return Err("403 Forbidden: Invalid table name".to_string());
    }
    
    let safe_table = table.replace("\"", "\"\"");
    
    // 2. Validate sort_by
    let order_clause = if let Some(col) = sort_by {
        if !col.is_empty() && col.chars().all(|c| c.is_alphanumeric() || c == '_') {
            format!("ORDER BY \"{}\" ASC", col)
        } else {
            "".to_string()
        }
    } else {
        "".to_string()
    };
    
    // 3. Build query with optional filter
    let where_clause = if let Some(f) = filter {
        if !f.is_empty() {
            let safe_filter = f.replace("'", "''");
            if safe_filter.contains(';') || safe_filter.to_lowercase().contains("drop") {
                return Err("403 Forbidden: Invalid filter syntax".to_string());
            }
            format!("WHERE {}", safe_filter)
        } else {
            "".to_string()
        }
    } else {
        "".to_string()
    };

    let count_query = format!("SELECT COUNT(*) FROM \"{}\" {}", safe_table, where_clause);
    let total_count: i64 = sqlx::query_scalar(&count_query)
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let data_query = format!(
        "SELECT * FROM \"{}\" {} {} LIMIT ? OFFSET ?;",
        safe_table, where_clause, order_clause
    );

    let rows: Vec<SqliteRow> = sqlx::query(&data_query)
        .bind(limit)
        .bind(offset)
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut columns = Vec::new();
    let mut result_rows = Vec::new();

    if let Some(first_row) = rows.first() {
        columns = first_row.columns().iter().map(|c| c.name().to_string()).collect();
    }

    for row in rows {
        let mut row_data = Vec::new();
        for col in &columns {
            let val: serde_json::Value = if let Ok(v) = row.try_get::<String, _>(col.as_str()) {
                serde_json::Value::String(v)
            } else if let Ok(v) = row.try_get::<i64, _>(col.as_str()) {
                serde_json::Value::Number(v.into())
            } else if let Ok(v) = row.try_get::<f64, _>(col.as_str()) {
                serde_json::json!(v)
            } else if let Ok(v) = row.try_get::<bool, _>(col.as_str()) {
                serde_json::Value::Bool(v)
            } else {
                serde_json::Value::Null
            };
            row_data.push(val);
        }
        result_rows.push(row_data);
    }

    Ok(QueryResult { columns, rows: result_rows, total_count })
}

#[tauri::command]
pub async fn run_readonly_query(app: AppHandle, query: String) -> Result<QueryResult, String> {
    let pool = get_read_only_pool(&app).await?;
    
    let trimmed = query.trim().to_lowercase();
    if !trimmed.starts_with("select") && !trimmed.starts_with("explain") {
        return Err("403 Forbidden: Only SELECT and EXPLAIN queries are allowed".to_string());
    }
    
    if trimmed.contains(';') && trimmed.split(';').filter(|s| !s.trim().is_empty()).count() > 1 {
        return Err("403 Forbidden: Multiple statements are not allowed".to_string());
    }

    let forbidden = ["insert", "update", "delete", "drop", "alter", "create", "attach", "detach"];
    for word in forbidden {
        if trimmed.contains(word) {
            return Err(format!("403 Forbidden: Keyword '{}' is not allowed", word));
        }
    }

    let rows: Vec<SqliteRow> = sqlx::query(&query)
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut columns = Vec::new();
    let mut result_rows = Vec::new();

    if let Some(first_row) = rows.first() {
        columns = first_row.columns().iter().map(|c| c.name().to_string()).collect();
    }

    for row in rows {
        let mut row_data = Vec::new();
        for col in &columns {
            let val: serde_json::Value = if let Ok(v) = row.try_get::<String, _>(col.as_str()) {
                serde_json::Value::String(v)
            } else if let Ok(v) = row.try_get::<i64, _>(col.as_str()) {
                serde_json::Value::Number(v.into())
            } else if let Ok(v) = row.try_get::<f64, _>(col.as_str()) {
                serde_json::json!(v)
            } else if let Ok(v) = row.try_get::<bool, _>(col.as_str()) {
                serde_json::Value::Bool(v)
            } else {
                serde_json::Value::Null
            };
            row_data.push(val);
        }
        result_rows.push(row_data);
    }
    let total_count = result_rows.len() as i64;
    Ok(QueryResult { columns, rows: result_rows, total_count })
}