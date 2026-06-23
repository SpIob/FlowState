// src-tauri/src/commands/fs.rs
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String, // Absolute path
    pub is_dir: bool,
}

#[tauri::command]
pub fn read_directory(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&dir_path);
    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }

    let mut entries = Vec::new();
    let read_dir = fs::read_dir(path).map_err(|e| e.to_string())?;

    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        
        // Basic filtering for hidden files and common noise
        if file_name.starts_with('.') || file_name == "node_modules" || file_name == "target" {
            continue;
        }

        let path_str = entry.path().to_string_lossy().to_string();
        let is_dir = entry.path().is_dir();

        entries.push(FileEntry {
            name: file_name,
            path: path_str,
            is_dir,
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    Ok(entries)
}

#[tauri::command]
pub fn read_file(file_path: String) -> Result<String, String> {
    fs::read_to_string(file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(file_path: String, content: String) -> Result<(), String> {
    fs::write(file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
pub fn create_file(file_path: String) -> Result<(), String> {
    std::fs::File::create(&file_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_dir(dir_path: String) -> Result<(), String> {
    std::fs::create_dir_all(&dir_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    std::fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_path(path: String) -> Result<(), String> {
    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    if metadata.is_dir() {
        std::fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
    } else {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn list_workspace_files(dir_path: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    let path = std::path::Path::new(&dir_path);
    
    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }

    fn scan_dir(dir: &std::path::Path, files: &mut Vec<String>) -> Result<(), String> {
        let read_dir = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
        for entry in read_dir {
            let entry = entry.map_err(|e| e.to_string())?;
            let file_name = entry.file_name().to_string_lossy().to_string();
            
            // Skip hidden folders and heavy build/dependency directories
            if file_name.starts_with('.') || file_name == "node_modules" || file_name == "target" || file_name == "dist" || file_name == "build" || file_name == "venv" || file_name == "__pycache__" {
                continue;
            }

            let current_path = entry.path();
            if current_path.is_dir() {
                scan_dir(&current_path, files)?;
            } else {
                files.push(current_path.to_string_lossy().to_string());
            }
        }
        Ok(())
    }

    scan_dir(path, &mut files)?;
    Ok(files)
}