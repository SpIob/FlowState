// FILE 2: src-tauri/src/commands/cognitive_score.rs
use crate::state::DbState;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct ScoringWeights {
    pub pause_proportion: f64,
    pub iki_variance: f64,
    pub backspace_latency: f64,
    pub focus_duration: f64,
    pub iki_baseline: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SignalBreakdown {
    pub pause_proportion: f64,
    pub iki_variance: f64,
    pub backspace_latency: f64,
    pub focus_duration: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CognitiveScoreResult {
    pub score: f64,
    pub signals: SignalBreakdown,
    pub is_high_load: bool,
}

#[tauri::command]
pub async fn get_scoring_weights(db: State<'_, DbState>) -> Result<ScoringWeights, String> {
    let weights = sqlx::query_as::<_, ScoringWeights>(
        "SELECT pause_proportion, iki_variance, backspace_latency, focus_duration, iki_baseline 
         FROM scoring_weights WHERE id = 1"
    )
    .fetch_one(&db.pool)
    .await
    .map_err(|e| format!("Failed to fetch weights: {}", e))?;
    
    Ok(weights)
}

#[tauri::command]
pub async fn update_scoring_weights(
    weights: ScoringWeights,
    db: State<'_, DbState>,
) -> Result<(), String> {
    // Renormalize to sum to 1.0
    let sum = weights.pause_proportion 
        + weights.iki_variance 
        + weights.backspace_latency 
        + weights.focus_duration;
    
    let normalized = ScoringWeights {
        pause_proportion: weights.pause_proportion / sum,
        iki_variance: weights.iki_variance / sum,
        backspace_latency: weights.backspace_latency / sum,
        focus_duration: weights.focus_duration / sum,
        iki_baseline: weights.iki_baseline,
    };
    
    sqlx::query(
        "INSERT INTO scoring_weights (id, pause_proportion, iki_variance, backspace_latency, focus_duration, iki_baseline, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           pause_proportion = excluded.pause_proportion,
           iki_variance = excluded.iki_variance,
           backspace_latency = excluded.backspace_latency,
           focus_duration = excluded.focus_duration,
           iki_baseline = excluded.iki_baseline,
           updated_at = datetime('now')"
    )
    .bind(normalized.pause_proportion)
    .bind(normalized.iki_variance)
    .bind(normalized.backspace_latency)
    .bind(normalized.focus_duration)
    .bind(normalized.iki_baseline)
    .execute(&db.pool)
    .await
    .map_err(|e| format!("Failed to update weights: {}", e))?;
    
    Ok(())
}

#[derive(Debug, Deserialize)]
struct KeystrokeBatch {
    events: Vec<KeystrokeEvent>,
}

#[derive(Debug, Deserialize)]
struct KeystrokeEvent {
    key: String,
    #[serde(rename = "timestampMs")]
    timestamp: i64,
}

#[derive(Debug, Deserialize)]
struct FocusChange {
    focused: bool,
    #[serde(rename = "timestampMs")]
    timestamp: i64,
}

#[tauri::command]
pub async fn compute_cognitive_score(
    db: State<'_, DbState>,
) -> Result<CognitiveScoreResult, String> {
    // Fetch weights
    let weights = get_scoring_weights(db.clone()).await?;
    
    // Fetch recent signal events (last 5 minutes)
    let events = sqlx::query_as::<_, (String, String)>(
        "SELECT event_type, payload FROM signal_events 
         WHERE created_at >= datetime('now', '-5 minutes')
         ORDER BY created_at ASC"
    )
    .fetch_all(&db.pool)
    .await
    .map_err(|e| format!("Failed to fetch events: {}", e))?;
    
    let mut keystroke_timestamps: Vec<i64> = Vec::new();
    let mut backspace_latencies: Vec<f64> = Vec::new();
    let mut focus_periods: Vec<(i64, bool)> = Vec::new();
    
    // Parse events
    for (event_type, payload) in events {
        match event_type.as_str() {
            "keystroke_batch" => {
                if let Ok(batch) = serde_json::from_str::<KeystrokeBatch>(&payload) {
                    for keystroke in batch.events {
                        keystroke_timestamps.push(keystroke.timestamp);
                        if keystroke.key == "Backspace" && keystroke_timestamps.len() > 1 {
                            let prev_idx = keystroke_timestamps.len() - 2;
                            let latency = (keystroke.timestamp - keystroke_timestamps[prev_idx]) as f64 / 1000.0;
                            backspace_latencies.push(latency);
                        }
                    }
                }
            }
            "focus_change" => {
                if let Ok(change) = serde_json::from_str::<FocusChange>(&payload) {
                    focus_periods.push((change.timestamp, change.focused));
                }
            }
            _ => {}
        }
    }
    
    // Calculate IKI variance
    let mut iki_values: Vec<f64> = Vec::new();
    if keystroke_timestamps.len() > 1 {
        for i in 1..keystroke_timestamps.len() {
            let interval = (keystroke_timestamps[i] - keystroke_timestamps[i - 1]) as f64 / 1000.0;
            iki_values.push(interval);
        }
    }
    
    let iki_variance = if !iki_values.is_empty() {
        let mean = iki_values.iter().sum::<f64>() / iki_values.len() as f64;
        let variance = iki_values.iter()
            .map(|&x| (x - mean).powi(2))
            .sum::<f64>() / iki_values.len() as f64;
        
        // Update baseline with EMA (alpha=0.1)
        let new_baseline = weights.iki_baseline * 0.9 + mean * 0.1;
        
        // Normalize variance against baseline
        let normalized = variance / (new_baseline * new_baseline + 0.01);
        normalized.clamp(0.0, 1.0)
    } else {
        0.0
    };
    
    // Calculate pause proportion (45s - 360s range)
    let pause_proportion = if !iki_values.is_empty() {
        let pause_count = iki_values.iter()
            .filter(|&&x| x >= 45.0 && x <= 360.0)
            .count();
        (pause_count as f64 / iki_values.len() as f64).clamp(0.0, 1.0)
    } else {
        0.0
    };
    
    // Calculate backspace latency
    let backspace_latency = if !backspace_latencies.is_empty() {
        let avg_latency = backspace_latencies.iter().sum::<f64>() / backspace_latencies.len() as f64;
        (avg_latency / 3.0).clamp(0.0, 1.0)
    } else {
        0.0
    };
    
    // Calculate focus duration (inverted signal)
    let focus_duration = if !focus_periods.is_empty() {
        // Find current continuous focus streak
        let mut current_streak = 0i64;
        
        // Standard library replacement for chrono::Utc::now().timestamp_millis()
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;
        
        for i in (0..focus_periods.len()).rev() {
            if focus_periods[i].1 {
                let start = focus_periods[i].0;
                let end = if i + 1 < focus_periods.len() {
                    focus_periods[i + 1].0
                } else {
                    now
                };
                current_streak = end - start;
                break;
            }
        }
        
        let normalized_focus = (current_streak as f64 / 1000.0) / 3120.0;
        let normalized_focus = normalized_focus.clamp(0.0, 1.0);
        
        // Invert: long focus = low load
        (1.0 - normalized_focus).clamp(0.0, 1.0)
    } else {
        0.0
    };
    
    // Calculate composite score
    let score = weights.pause_proportion * pause_proportion
        + weights.iki_variance * iki_variance
        + weights.backspace_latency * backspace_latency
        + weights.focus_duration * focus_duration;
    
    let score = score.clamp(0.0, 1.0);
    
    let result = CognitiveScoreResult {
        score,
        signals: SignalBreakdown {
            pause_proportion,
            iki_variance,
            backspace_latency,
            focus_duration,
        },
        is_high_load: score > 0.6,
    };
    
    // Save to history
    let signals_json = serde_json::to_string(&result.signals)
        .map_err(|e| format!("Failed to serialize signals: {}", e))?;
    
    sqlx::query("INSERT INTO score_history (score, signals_json) VALUES (?, ?)")
        .bind(result.score)
        .bind(&signals_json)
        .execute(&db.pool)
        .await
        .map_err(|e| format!("Failed to save score: {}", e))?;
    
    // Update baseline if we calculated new IKI values
    if !iki_values.is_empty() {
        let mean = iki_values.iter().sum::<f64>() / iki_values.len() as f64;
        let new_baseline = weights.iki_baseline * 0.9 + mean * 0.1;
        
        sqlx::query("UPDATE scoring_weights SET iki_baseline = ? WHERE id = 1")
            .bind(new_baseline)
            .execute(&db.pool)
            .await
            .map_err(|e| format!("Failed to update baseline: {}", e))?;
    }
    
    Ok(result)
}