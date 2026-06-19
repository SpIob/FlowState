// FILE 3: src-tauri/src/commands/focus_macos.rs
#![cfg(target_os = "macos")]

use std::process::Command;

#[tauri::command]
pub async fn trigger_focus_mode() -> Result<(), String> {
    let output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Shortcuts Events\" to run shortcut \"FlowState Focus\"")
        .output()
        .map_err(|e| format!("Failed to execute osascript: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "Failed to trigger Focus mode. The 'FlowState Focus' shortcut may not exist or Automation permission was denied. Error: {}",
            stderr
        ));
    }
    
    Ok(())
}

#[tauri::command]
pub async fn check_shortcut_exists() -> Result<bool, String> {
    let output = Command::new("shortcuts")
        .arg("list")
        .output()
        .map_err(|e| format!("Failed to execute shortcuts command: {}", e))?;
    
    if !output.status.success() {
        return Ok(false);
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let exists = stdout.lines().any(|line| line.trim() == "FlowState Focus");
    
    Ok(exists)
}