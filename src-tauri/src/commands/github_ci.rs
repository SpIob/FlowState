// src-tauri/src/commands/github_ci.rs
use serde::{Deserialize, Serialize};
use tauri::command;
use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT, ACCEPT, AUTHORIZATION};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WorkflowRun {
    pub id: u64,
    pub name: Option<String>,
    pub status: String,
    pub conclusion: Option<String>,
    pub created_at: String,
    pub html_url: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WorkflowJob {
    pub id: u64,
    pub name: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Deserialize)]
struct RunsResponse {
    workflow_runs: Vec<WorkflowRun>,
}

#[derive(Deserialize)]
struct JobsResponse {
    jobs: Vec<WorkflowJob>,
}

fn build_client(pat: &Option<String>) -> Result<reqwest::Client, String> {
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static("FlowState-Desktop/0.1"));
    headers.insert(ACCEPT, HeaderValue::from_static("application/vnd.github+json"));
    headers.insert("X-GitHub-Api-Version", HeaderValue::from_static("2022-11-28"));
    
    if let Some(token) = pat {
        if !token.is_empty() {
            let mut auth_value = HeaderValue::from_str(&format!("Bearer {}", token)).map_err(|e| e.to_string())?;
            auth_value.set_sensitive(true); // Prevents token from leaking in debug logs
            headers.insert(AUTHORIZATION, auth_value);
        }
    }

    reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| e.to_string())
}

#[command]
pub async fn list_workflow_runs(owner: String, repo: String, pat: Option<String>) -> Result<Vec<WorkflowRun>, String> {
    let client = build_client(&pat)?;
    let url = format!("https://api.github.com/repos/{}/{}/actions/runs?per_page=15", owner, repo);
    
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("GitHub API error: {}", res.status()));
    }
    
    let data: RunsResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(data.workflow_runs)
}

#[command]
pub async fn get_workflow_jobs(owner: String, repo: String, run_id: u64, pat: Option<String>) -> Result<Vec<WorkflowJob>, String> {
    let client = build_client(&pat)?;
    let url = format!("https://api.github.com/repos/{}/{}/actions/runs/{}/jobs", owner, repo, run_id);
    
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("GitHub API error: {}", res.status()));
    }
    
    let data: JobsResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(data.jobs)
}

#[command]
pub async fn get_job_logs(owner: String, repo: String, job_id: u64, pat: Option<String>) -> Result<String, String> {
    let client = build_client(&pat)?;
    let url = format!("https://api.github.com/repos/{}/{}/actions/jobs/{}/logs", owner, repo, job_id);
    
    // GitHub automatically redirects this endpoint to an AWS S3 signed URL containing the raw logs
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("GitHub API error: {}", res.status()));
    }
    
    res.text().await.map_err(|e| e.to_string())
}