// FILE 4: src-tauri/src/commands/focus_windows.rs
#![cfg(target_os = "windows")]

use windows::UI::Shell::{FocusSessionManager, IFocusSessionManager};
use windows::Win32::System::Registry::{
    RegCreateKeyExW, RegSetValueExW, RegCloseKey, HKEY_CURRENT_USER, KEY_WRITE, REG_DWORD,
};
use windows::Win32::UI::Shell::SHChangeNotify;
use windows::Win32::Foundation::{HWND, BOOL};
use windows::core::HSTRING;

#[tauri::command]
pub async fn trigger_focus_mode() -> Result<(), String> {
    // Try primary method: FocusSessionManager
    let primary_result = try_focus_session_manager();
    
    if primary_result.is_ok() {
        return Ok(());
    }
    
    // Fall back to registry method
    try_registry_fallback()
}

fn try_focus_session_manager() -> Result<(), String> {
    unsafe {
        let manager: Result<IFocusSessionManager, _> = 
            FocusSessionManager::GetDefault();
        
        match manager {
            Ok(mgr) => {
                mgr.TryStartFocusSession()
                    .map_err(|e| format!("TryStartFocusSession failed: {}", e))?;
                Ok(())
            }
            Err(e) => Err(format!("FocusSessionManager unavailable: {}", e)),
        }
    }
}

fn try_registry_fallback() -> Result<(), String> {
    unsafe {
        let subkey = HSTRING::from("Software\\Microsoft\\Windows\\CurrentVersion\\FocusAssist");
        let mut hkey = std::mem::zeroed();
        
        let result = RegCreateKeyExW(
            HKEY_CURRENT_USER,
            &subkey,
            0,
            None,
            0,
            KEY_WRITE,
            None,
            &mut hkey,
            None,
        );
        
        if result.is_err() {
            return Err(format!("Failed to create registry key: {:?}", result));
        }
        
        let value_name = HSTRING::from("FocusAssistState");
        let value: u32 = 2; // Alarms Only
        
        let result = RegSetValueExW(
            hkey,
            &value_name,
            0,
            REG_DWORD,
            std::slice::from_raw_parts(&value as *const u32 as *const u8, 4),
        );
        
        RegCloseKey(hkey).ok();
        
        if result.is_err() {
            return Err(format!("Failed to set registry value: {:?}", result));
        }
        
        // Force system pickup
        SHChangeNotify(0x08000000, 0x1000, None, None);
        
        Ok(())
    }
}

#[tauri::command]
pub async fn check_shortcut_exists() -> Result<bool, String> {
    // Windows has no equivalent - always return true
    Ok(true)
}