// src-tauri/src/commands/git.rs
use git2::{Repository, Sort};
use serde::Serialize;

#[derive(Serialize)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
}

#[derive(Serialize)]
pub struct GitCommit {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: i64,
}

#[tauri::command]
pub fn get_status(repo_path: String) -> Result<Vec<GitFileStatus>, String> {
    // Strictly open the repo at the exact selected path
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let statuses = repo.statuses(None).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    
    for entry in statuses.iter() {
        let raw_path = entry.path().unwrap_or("");
        let status = entry.status();
        let mut status_strs = Vec::new();
        
        if status.contains(git2::Status::INDEX_NEW) || status.contains(git2::Status::WT_NEW) {
            status_strs.push("untracked");
        }
        if status.contains(git2::Status::INDEX_MODIFIED) || status.contains(git2::Status::WT_MODIFIED) {
            status_strs.push("modified");
        }
        if status.contains(git2::Status::INDEX_DELETED) || status.contains(git2::Status::WT_DELETED) {
            status_strs.push("deleted");
        }
        if status.contains(git2::Status::CONFLICTED) {
            status_strs.push("conflicted");
        }

        if status_strs.is_empty() {
            continue; 
        }

        result.push(GitFileStatus {
            path: raw_path.to_string(),
            status: status_strs.join(", "),
        });
    }
    Ok(result)
}

#[tauri::command]
pub fn get_log(repo_path: String, limit: usize) -> Result<Vec<GitCommit>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;
    revwalk.set_sorting(Sort::TIME).map_err(|e| e.to_string())?;
    let mut commits = Vec::new();
    for oid in revwalk.take(limit) {
        let oid = oid.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;

        commits.push(GitCommit {
            hash: commit.id().to_string(),
            message: commit.message().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            timestamp: commit.time().seconds(),
        });
    }
    Ok(commits)
}