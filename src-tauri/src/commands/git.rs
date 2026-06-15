use git2::{DiffFormat, DiffOptions, Repository, Sort};
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
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let statuses = repo.statuses(None).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
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
            status_strs.push("ignored");
        }

        result.push(GitFileStatus {
            path,
            status: status_strs.join(","),
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

#[tauri::command]
pub fn get_diff(repo_path: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut opts = DiffOptions::new();
    opts.pathspec(&file_path);

    // Diff between index and working directory (unstaged changes)
    let diff = repo
        .diff_index_to_workdir(None, Some(&mut opts))
        .map_err(|e| e.to_string())?;

    let mut diff_str = String::new();
    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        let content = std::str::from_utf8(line.content()).unwrap_or("");
        let origin = line.origin();
        match origin {
            '+' | '-' | ' ' => diff_str.push(origin),
            _ => {}
        }
        diff_str.push_str(content);
        true
    })
    .map_err(|e| e.to_string())?;

    Ok(diff_str)
}