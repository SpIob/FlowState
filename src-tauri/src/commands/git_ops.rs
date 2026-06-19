// src-tauri/src/commands/git_ops.rs

use git2::{
    Cred, CredentialType, DiffFormat, DiffOptions, Error as GitError, FetchOptions, MergeOptions,
    PushOptions, RemoteCallbacks, Repository,
};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MergeResult {
    pub success: bool,
    pub conflicts: Vec<String>,
}

/// Helper to open the repository from a user-provided path.
fn open_repo(repo_path: &str) -> Result<Repository, String> {
    Repository::open(repo_path).map_err(|e| format!("Not a git repository: {}", e.message()))
}

fn map_git_error(e: GitError) -> String {
    format!("[{:?}] {}", e.class(), e.message())
}

fn setup_callbacks(username: Option<String>, password: Option<String>) -> RemoteCallbacks<'static> {
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(move |_url, username_from_url, allowed_types| {
        if allowed_types.contains(CredentialType::SSH_KEY) {
            Cred::ssh_key_from_agent(username_from_url.unwrap_or("git"))
        } else if allowed_types.contains(CredentialType::USER_PASS_PLAINTEXT) {
            // 1. Try provided PAT (for HTTPS)
            if let (Some(u), Some(p)) = (&username, &password) {
                Cred::userpass_plaintext(u, p)
            // 2. Fallback to system credential helper (macOS Keychain / Windows CredMan)
            } else if let Ok(config) = git2::Config::open_default() {
                Cred::credential_helper(&config, _url, username_from_url)
            } else {
                Cred::default()
            }
        } else {
            Cred::default()
        }
    });
    callbacks
}

#[tauri::command]
pub async fn stage_file(repo_path: String, path: String) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let mut index = repo.index().map_err(map_git_error)?;
    index.add_path(Path::new(&path)).map_err(map_git_error)?;
    index.write().map_err(map_git_error)?;
    Ok(())
}

#[tauri::command]
pub async fn unstage_file(repo_path: String, path: String) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let mut index = repo.index().map_err(map_git_error)?;
    index.remove_path(Path::new(&path)).map_err(map_git_error)?;
    index.write().map_err(map_git_error)?;
    Ok(())
}

#[tauri::command]
pub async fn commit(repo_path: String, message: String) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    let mut index = repo.index().map_err(map_git_error)?;
    
    // Write the current index (staged files) to a tree object
    let tree_id = index.write_tree().map_err(map_git_error)?;
    let tree = repo.find_tree(tree_id).map_err(map_git_error)?;
    let sig = repo.signature().map_err(map_git_error)?;
    
    // Get the current HEAD commit as the parent (if it exists)
    let mut parents = vec![];
    if let Ok(head) = repo.head() {
        if let Ok(commit) = head.peel_to_commit() {
            parents.push(commit);
        }
    }
    
    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
    
    // Create the commit
    let oid = repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &message,
        &tree,
        &parent_refs,
    ).map_err(map_git_error)?;
    
    Ok(oid.to_string())
}

#[tauri::command]
pub async fn get_diff(repo_path: String, path: Option<String>) -> Result<String, String> {
    let repo = open_repo(&repo_path)?;
    let mut opts = DiffOptions::new();
    if let Some(ref p) = path {
        opts.pathspec(p.as_str());
    }

    let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
    
    let diff = if let Some(tree) = head_tree {
        repo.diff_tree_to_workdir_with_index(Some(&tree), Some(&mut opts))
    } else {
        repo.diff_index_to_workdir(None, Some(&mut opts))
    }.map_err(map_git_error)?;

    let mut diff_str = String::new();
    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        let origin = line.origin();
        match origin {
            '+' | '-' | ' ' => diff_str.push(origin),
            _ => {}
        }
        if let Ok(content) = std::str::from_utf8(line.content()) {
            diff_str.push_str(content);
        }
        true
    }).map_err(map_git_error)?;

    Ok(diff_str)
}

#[tauri::command]
pub async fn create_branch(repo_path: String, name: String, start_point: Option<String>) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let commit = if let Some(sp) = start_point {
        repo.revparse_single(&sp).map_err(map_git_error)?.peel_to_commit().map_err(map_git_error)?
    } else {
        repo.head().map_err(map_git_error)?.peel_to_commit().map_err(map_git_error)?
    };
    
    repo.branch(&name, &commit, false).map_err(map_git_error)?;
    Ok(())
}

#[tauri::command]
pub async fn checkout_branch(repo_path: String, name: String) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let ref_name = format!("refs/heads/{}", name);
    
    let obj = repo.revparse_single(&ref_name).map_err(map_git_error)?;
    repo.checkout_tree(&obj, None).map_err(map_git_error)?;
    repo.set_head(&ref_name).map_err(map_git_error)?;
    
    Ok(())
}

#[tauri::command]
pub async fn merge_branch(repo_path: String, branch: String) -> Result<MergeResult, String> {
    let repo = open_repo(&repo_path)?;
    let ref_name = format!("refs/heads/{}", branch);
    
    let obj = repo.revparse_single(&ref_name).map_err(map_git_error)?;
    let annotated_commit = repo.find_annotated_commit(obj.id()).map_err(map_git_error)?;
    
    let (analysis, _) = repo.merge_analysis(&[&annotated_commit]).map_err(map_git_error)?;

    if analysis.is_up_to_date() {
        return Ok(MergeResult { success: true, conflicts: vec![] });
    } 
    
    if analysis.is_fast_forward() {
        return Ok(MergeResult { success: true, conflicts: vec![] });
    }

    let mut merge_opts = MergeOptions::new();
    repo.merge(&[&annotated_commit], Some(&mut merge_opts), None).map_err(map_git_error)?;
    
    let mut index = repo.index().map_err(map_git_error)?;
    if index.has_conflicts() {
        let conflicts: Vec<String> = index
            .conflicts()
            .map_err(map_git_error)?
            .filter_map(|c| c.ok())
            .filter_map(|conflict| conflict.our.as_ref().and_then(|p| std::str::from_utf8(&p.path).ok().map(String::from)))
            .collect();
        return Ok(MergeResult { success: false, conflicts });
    }

    let tree_id = index.write_tree().map_err(map_git_error)?;
    let tree = repo.find_tree(tree_id).map_err(map_git_error)?;
    let sig = repo.signature().map_err(map_git_error)?;
    
    let head_commit = repo.head().map_err(map_git_error)?.peel_to_commit().map_err(map_git_error)?;
    let merge_commit = repo.find_commit(annotated_commit.id()).map_err(map_git_error)?;
    
    let msg = format!("Merge branch '{}'", branch);
    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &msg,
        &tree,
        &[&head_commit, &merge_commit],
    ).map_err(map_git_error)?;
    
    repo.cleanup_state().map_err(map_git_error)?;

    Ok(MergeResult { success: true, conflicts: vec![] })
}

#[tauri::command]
pub async fn fetch_remote(
    repo_path: String, 
    remote_name: String,
    username: Option<String>,
    password: Option<String>
) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let mut remote = repo.find_remote(&remote_name).map_err(map_git_error)?;
    
    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(setup_callbacks(username, password));
    
    remote.fetch(&[] as &[&str], Some(&mut fetch_opts), None).map_err(map_git_error)?;
    Ok(())
}

#[tauri::command]
pub async fn pull_remote(
    repo_path: String, 
    remote_name: String, 
    branch: String,
    username: Option<String>,
    password: Option<String>
) -> Result<MergeResult, String> {
    fetch_remote(repo_path.clone(), remote_name.clone(), username.clone(), password.clone()).await?;
    
    let repo = open_repo(&repo_path)?;
    let fetch_head = repo.find_reference("FETCH_HEAD").map_err(map_git_error)?;
    let fetch_head_commit = repo.reference_to_annotated_commit(&fetch_head).map_err(map_git_error)?;
    
    let (analysis, _) = repo.merge_analysis(&[&fetch_head_commit]).map_err(map_git_error)?;
    
    if analysis.is_up_to_date() {
        return Ok(MergeResult { success: true, conflicts: vec![] });
    }
    
    let mut merge_opts = MergeOptions::new();
    repo.merge(&[&fetch_head_commit], Some(&mut merge_opts), None).map_err(map_git_error)?;
    
    let mut index = repo.index().map_err(map_git_error)?;
    if index.has_conflicts() {
        let conflicts: Vec<String> = index
            .conflicts()
            .map_err(map_git_error)?
            .filter_map(|c| c.ok())
            .filter_map(|conflict| conflict.our.as_ref().and_then(|p| std::str::from_utf8(&p.path).ok().map(String::from)))
            .collect();
        return Ok(MergeResult { success: false, conflicts });
    }

    let tree_id = index.write_tree().map_err(map_git_error)?;
    let tree = repo.find_tree(tree_id).map_err(map_git_error)?;
    let sig = repo.signature().map_err(map_git_error)?;
    
    let head_commit = repo.head().map_err(map_git_error)?.peel_to_commit().map_err(map_git_error)?;
    let merge_commit = repo.find_commit(fetch_head_commit.id()).map_err(map_git_error)?;
    
    let msg = format!("Pull from {}/{}", remote_name, branch);
    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &msg,
        &tree,
        &[&head_commit, &merge_commit],
    ).map_err(map_git_error)?;
    
    repo.cleanup_state().map_err(map_git_error)?;

    Ok(MergeResult { success: true, conflicts: vec![] })
}

#[tauri::command]
pub async fn push_remote(
    repo_path: String, 
    remote_name: String, 
    branch: String,
    username: Option<String>,
    password: Option<String>
) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let mut remote = repo.find_remote(&remote_name).map_err(map_git_error)?;
    
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);
    
    let mut push_opts = PushOptions::new();
    push_opts.remote_callbacks(setup_callbacks(username, password));
    
    remote.push(&[&refspec], Some(&mut push_opts)).map_err(map_git_error)?;
    
    Ok(())
}

#[tauri::command]
pub async fn init_repo(repo_path: String) -> Result<(), String> {
    Repository::init(&repo_path).map_err(map_git_error)?;
    Ok(())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BranchInfo {
    pub name: String,
    pub is_head: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RemoteInfo {
    pub name: String,
    pub url: String,
}

#[tauri::command]
pub async fn list_branches(repo_path: String) -> Result<Vec<BranchInfo>, String> {
    let repo = open_repo(&repo_path)?;
    let mut branches = Vec::new();
    
    for branch_result in repo.branches(Some(git2::BranchType::Local)).map_err(map_git_error)? {
        // Destructure the tuple to get the actual Branch object
        let (branch, _branch_type) = branch_result.map_err(map_git_error)?;
        
        let name = branch.name().map_err(map_git_error)?.unwrap_or("").to_string();
        let is_head = branch.is_head();
        
        branches.push(BranchInfo { name, is_head });
    }
    Ok(branches)
}

#[tauri::command]
pub async fn delete_branch(repo_path: String, name: String) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    let mut branch = repo.find_branch(&name, git2::BranchType::Local).map_err(map_git_error)?;
    branch.delete().map_err(map_git_error)?;
    Ok(())
}

#[tauri::command]
pub async fn list_remotes(repo_path: String) -> Result<Vec<RemoteInfo>, String> {
    let repo = open_repo(&repo_path)?;
    let remotes = repo.remotes().map_err(map_git_error)?;
    let mut result = Vec::new();
    
    for name in remotes.iter() {
        if let Some(name) = name {
            if let Ok(remote) = repo.find_remote(name) {
                result.push(RemoteInfo {
                    name: name.to_string(),
                    url: remote.url().unwrap_or("").to_string(),
                });
            }
        }
    }
    Ok(result)
}

#[tauri::command]
pub async fn add_remote(repo_path: String, name: String, url: String) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    repo.remote(&name, &url).map_err(map_git_error)?;
    Ok(())
}

#[tauri::command]
pub async fn remove_remote(repo_path: String, name: String) -> Result<(), String> {
    let repo = open_repo(&repo_path)?;
    repo.remote_delete(&name).map_err(map_git_error)?;
    Ok(())
}

#[tauri::command]
pub fn get_origin_info(repo_path: String) -> Result<(String, String), String> {
    let repo = open_repo(&repo_path)?;
    let remote = repo.find_remote("origin").map_err(|_| "No 'origin' remote found".to_string())?;
    let url = remote.url().unwrap_or("");
    
    // Parses both https://github.com/owner/repo.git and git@github.com:owner/repo.git
    let clean_url = url.trim_end_matches(".git");
    if clean_url.contains("github.com") {
        if let Some(path) = clean_url.split("github.com").nth(1) {
            let parts: Vec<&str> = path.trim_start_matches(|c| c == '/' || c == ':').split('/').collect();
            if parts.len() >= 2 {
                return Ok((parts[0].to_string(), parts[1].to_string()));
            }
        }
    }
    Err("Could not parse GitHub owner/repo from origin URL".to_string())
}