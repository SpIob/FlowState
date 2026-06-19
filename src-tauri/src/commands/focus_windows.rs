#![cfg(target_os = "windows")]

use tauri::command;
use windows::core::HSTRING;
use windows::Win32::System::Registry::{
    RegCreateKeyExW, RegSetValueExW, RegCloseKey, HKEY, HKEY_CURRENT_USER, KEY_WRITE, REG_DWORD, REG_OPTION_NON_VOLATILE
};
use windows::Win32::UI::Shell::{SHChangeNotify, SHCNE_ASSOCCHANGED, SHCNF_IDLIST};

#[command]
pub fn trigger_focus_mode() -> Result<(), String> {
    let subkey = HSTRING::from("Software\\Microsoft\\Windows\\CurrentVersion\\FocusAssist");
    let mut hkey = HKEY::default();
    
    unsafe {
        let create_result = RegCreateKeyExW(
            HKEY_CURRENT_USER,
            &subkey,
            0,
            None,
            REG_OPTION_NON_VOLATILE,
            KEY_WRITE,
            None,
            &mut hkey,
            None,
        );
        
        // WIN32_ERROR requires .ok() to convert to a standard Result
        if let Err(e) = create_result.ok() {
            return Err(format!("Failed to open registry key: {}", e));
        }

        // 2 = Alarms Only (Deep Work)
        let value: u32 = 2; 
        
        let set_result = RegSetValueExW(
            hkey,
            None, // Sets the default value of the key
            0,
            REG_DWORD,
            Some(&value.to_le_bytes()),
        );

        let _ = RegCloseKey(hkey);

        if let Err(e) = set_result.ok() {
            return Err(format!("Failed to write registry value: {}", e));
        }

        // Force system to pick up the change immediately
        SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, None, None);
    }

    Ok(())
}

#[command]
pub fn check_shortcut_exists() -> Result<bool, String> {
    // Windows has no manual shortcut setup requirement
    Ok(true)
}