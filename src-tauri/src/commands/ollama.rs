// src-tauri/src/commands/ollama.rs
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
    pub modified_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Deserialize, Debug)]
struct OllamaChatResponse {
    message: Option<OllamaMessage>,
    done: bool,
}

#[derive(Deserialize, Debug)]
struct OllamaMessage {
    content: String,
}

#[tauri::command]
pub async fn list_models() -> Result<Vec<OllamaModel>, String> {
    let client = Client::new();
    let res = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json_val: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;

    let models = json_val
        .get("models")
        .and_then(|m| m.as_array())
        .ok_or("Invalid response format from Ollama")?;

    let mut result = Vec::new();
    for model in models {
        let name = model.get("name").and_then(|n| n.as_str()).unwrap_or("").to_string();
        let size = model.get("size").and_then(|s| s.as_u64()).unwrap_or(0);
        let modified_at = model.get("modified_at").and_then(|m| m.as_str()).unwrap_or("").to_string();
        
        result.push(OllamaModel {
            name,
            size,
            modified_at,
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn chat_stream(
    app: AppHandle,
    model: String,
    messages: Vec<ChatMessage>,
) -> Result<(), String> {
    let client = Client::new();
    
    // Ollama requires this exact payload structure
    let payload = json!({
        "model": model,
        "messages": messages,
        "stream": true
    });

    let res = client
        .post("http://localhost:11434/api/chat")
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            let _ = app.emit("chat-done", ()); // Guarantee UI unlocks
            format!("Failed to connect to Ollama. Is it running? ({})", e)
        })?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_else(|_| "Unknown Ollama error".to_string());
        let _ = app.emit("chat-done", ()); // Guarantee UI unlocks
        return Err(format!("Ollama API error: {}", err_text));
    }

    // Read the full response text (safest approach without extra stream dependencies)
    let text = res.text().await.map_err(|e| {
        let _ = app.emit("chat-done", ());
        e.to_string()
    })?;

    // Ollama returns NDJSON (newline-delimited JSON)
    for line in text.lines() {
        if line.trim().is_empty() { continue; }
         
        if let Ok(parsed) = serde_json::from_str::<OllamaChatResponse>(line) {
            if let Some(msg) = parsed.message {
                let _ = app.emit("chat-chunk", msg.content);
            }
            if parsed.done {
                break;
            }
        }
    }

    let _ = app.emit("chat-done", ()); // Guarantee UI unlocks
    Ok(())
}

#[tauri::command]
pub async fn complete_code(
    model: String,
    prefix: String,
    suffix: String,
) -> Result<String, String> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let prompt = format!(
        "<|fim_prefix|>{}<|fim_suffix|>{}<|fim_middle|>",
        prefix, suffix
    );

    let body = json!({
        "model": model,
        "prompt": prompt,
        "raw": true,
        "stream": false,
        "options": {
            "num_predict": 60,
            "temperature": 0.2,
            "stop": ["<|fim_prefix|>", "<|fim_suffix|>", "<|fim_middle|>", "<|endoftext|>", "\n\n\n"]
        }
    });

    let res = client
        .post("http://localhost:11434/api/generate")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json_val: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;

    let raw = json_val
        .get("response")
        .and_then(|r| r.as_str())
        .unwrap_or("")
        .trim();

    let response = strip_code_fence(raw).trim_end().to_string();

    Ok(response)
}

/// Strips a leading/trailing markdown code fence (`lang ...`) if present.
/// Some instruct-tuned models wrap FIM completions in a fenced block even
/// when asked for raw infill text — this normalizes that back to plain code.
fn strip_code_fence(text: &str) -> &str {
    let trimmed = text.trim();
    if !trimmed.starts_with('`') {
        return text;
    }
    let after_open = match trimmed.find('\n') {
        Some(idx) => &trimmed[idx + 1..],
        None => return text,
    };

    match after_open.rfind('`') {
        Some(idx) => after_open[..idx].trim_end(),
        None => after_open,
    }
}

#[tauri::command]
pub async fn check_ollama() -> Result<bool, String> {
    let client = Client::new();
    match client.get("http://localhost:11434/").send().await {
        Ok(_) => Ok(true),
        Err(e) => {
            if e.is_connect() {
                Ok(false)
            } else {
                Err(e.to_string())
            }
        }
    }
}