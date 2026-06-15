use crate::state::AppState;
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::io::{Read, Write};
use std::thread;
use tauri::{Emitter, State, Window};

#[tauri::command]
pub fn spawn_shell(window: Window, state: State<AppState>) -> Result<(), String> {
    let pty_system = NativePtySystem::default();
    let pty_pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let shell = if cfg!(target_os = "windows") {
        "cmd.exe".to_string()
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "bash".to_string())
    };

    let cmd = CommandBuilder::new(shell);
    let child = pty_pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| e.to_string())?;

    // Clone the reader for the background thread
    let mut reader = pty_pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    
    // Take the writer (can only be done once) for sending input to the shell
    let writer = pty_pair.master.take_writer().map_err(|e| e.to_string())?;

    let mut state_master = state.pty_master.lock().map_err(|e| e.to_string())?;
    *state_master = Some(pty_pair.master);
    drop(state_master);

    let mut state_writer = state.pty_writer.lock().map_err(|e| e.to_string())?;
    *state_writer = Some(writer);
    drop(state_writer);
    
    let mut state_child = state.pty_child.lock().map_err(|e| e.to_string())?;
    *state_child = Some(child);
    drop(state_child);
    
    // Drop the slave side in the parent process to avoid resource leaks
    drop(pty_pair.slave);

    let window_out = window.clone();
    thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    let output = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let _ = window_out.emit("terminal-output", output);
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn write_to_shell(input: String, state: State<AppState>) -> Result<(), String> {
    let mut term = state.pty_writer.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut writer) = *term {
        writer.write_all(input.as_bytes()).map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Shell not spawned yet".to_string())
    }
}

#[tauri::command]
pub fn resize_pty(cols: u16, rows: u16, state: State<AppState>) -> Result<(), String> {
    let term = state.pty_master.lock().map_err(|e| e.to_string())?;
    if let Some(master) = term.as_ref() {
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Shell not spawned yet".to_string())
    }
}