// src-tauri/src/commands/ollama.rs
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
    pub modified_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[tauri::command]
pub async fn list_models() -> Result<Vec<OllamaModel>, String> {
    let client = reqwest::Client::new();
    let res = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    
    let models = json
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
    window: tauri::Window,
    model: String,
    messages: Vec<ChatMessage>,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true
    });

    let res = client
        .post("http://localhost:11434/api/chat")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(newline_idx) = buffer.find('\n') {
            let line = buffer[..newline_idx].trim().to_string();
            buffer = buffer[newline_idx + 1..].to_string();

            if !line.is_empty() {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                    if let Some(content) = json.get("message").and_then(|m| m.get("content")).and_then(|c| c.as_str()) {
                        window.emit("ai-stream-chunk", content).map_err(|e| e.to_string())?;
                    }
                    if let Some(done) = json.get("done").and_then(|d| d.as_bool()) {
                        if done {
                            window.emit("ai-stream-done", "").map_err(|e| e.to_string())?;
                            return Ok(());
                        }
                    }
                }
            }
        }
    }
    
    // Fallback if stream ends unexpectedly without a "done" flag
    window.emit("ai-stream-done", "").map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn complete_code(
    model: String,
    prefix: String,
    suffix: String,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let prompt = format!(
        "<|fim_prefix|>{}<|fim_suffix|>{}<|fim_middle|>",
        prefix, suffix
    );

    let body = serde_json::json!({
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

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    
    let raw = json
        .get("response")
        .and_then(|r| r.as_str())
        .unwrap_or("")
        .trim();

    let response = strip_code_fence(raw).trim_end().to_string();

    Ok(response)
}

/// Strips a leading/trailing markdown code fence (```lang ... ```) if present.
/// Some instruct-tuned models wrap FIM completions in a fenced block even
/// when asked for raw infill text — this normalizes that back to plain code.
fn strip_code_fence(text: &str) -> &str {
    let trimmed = text.trim();
    if !trimmed.starts_with("```") {
        return text;
    }

    let after_open = match trimmed.find('\n') {
        Some(idx) => &trimmed[idx + 1..],
        None => return text,
    };

    match after_open.rfind("```") {
        Some(idx) => after_open[..idx].trim_end(),
        None => after_open,
    }
}

#[tauri::command]
pub async fn check_ollama() -> Result<bool, String> {
    let client = reqwest::Client::new();
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