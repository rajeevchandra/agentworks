// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod storage;
mod graph_api;
mod analyzer;
mod ollama;
mod agent;
mod filesystem;
mod scheduler;

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::State;
use chrono::Utc;

// Global agent manager and task scheduler
struct AppState {
    agent_manager: Mutex<agent::AgentManager>,
    task_scheduler: Arc<scheduler::TaskScheduler>,
    agents_config_path: std::path::PathBuf,
}

#[derive(Debug, Serialize, Deserialize)]
struct CommandResponse {
    success: bool,
    data: Option<serde_json::Value>,
    error: Option<String>,
}

// Secure token storage commands
#[tauri::command]
async fn store_token_secure(token: String) -> Result<CommandResponse, String> {
    match storage::store_token(&token) {
        Ok(_) => Ok(CommandResponse {
            success: true,
            data: None,
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

#[tauri::command]
async fn get_token_secure() -> Result<CommandResponse, String> {
    match storage::get_token() {
        Ok(token) => Ok(CommandResponse {
            success: true,
            data: Some(serde_json::json!({ "token": token })),
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

#[tauri::command]
async fn delete_token_secure() -> Result<CommandResponse, String> {
    match storage::delete_token() {
        Ok(_) => Ok(CommandResponse {
            success: true,
            data: None,
            error: None,
        }),
        Err(_) => Ok(CommandResponse {
            success: true,
            data: None,
            error: None,
        }),
    }
}

#[tauri::command]
async fn has_stored_token() -> Result<bool, String> {
    Ok(storage::has_token())
}

// Microsoft Graph API commands
#[tauri::command]
async fn fetch_drive_items(token: String, item_id: Option<String>) -> Result<CommandResponse, String> {
    let endpoint = match item_id {
        Some(id) => format!("/me/drive/items/{}/children", id),
        None => "/me/drive/root/children".to_string(),
    };

    match graph_api::graph_request(&token, &endpoint).await {
        Ok(data) => Ok(CommandResponse {
            success: true,
            data: Some(data),
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

#[tauri::command]
async fn fetch_user_profile(token: String) -> Result<CommandResponse, String> {
    match graph_api::graph_request(&token, "/me").await {
        Ok(data) => Ok(CommandResponse {
            success: true,
            data: Some(data),
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

#[tauri::command]
async fn search_files(token: String, query: String) -> Result<CommandResponse, String> {
    let endpoint = format!("/me/drive/root/search(q='{}')", query);
    
    match graph_api::graph_request(&token, &endpoint).await {
        Ok(data) => Ok(CommandResponse {
            success: true,
            data: Some(data),
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

// File analysis commands
#[tauri::command]
async fn analyze_file(
    token: String,
    item_id: String,
    file_name: String,
    file_size: u64,
    mime_type: Option<String>,
) -> Result<CommandResponse, String> {
    let is_text = mime_type.as_ref().map_or(false, |mt| {
        mt.contains("text") || 
        mt.contains("json") || 
        mt.contains("xml") ||
        mt.contains("javascript") ||
        mt.contains("typescript")
    });

    if is_text && file_size < 5_000_000 {
        match graph_api::download_file_content(&token, &item_id).await {
            Ok(bytes) => {
                if let Ok(content) = String::from_utf8(bytes) {
                    match analyzer::analyze_text_content(&file_name, file_size, &content) {
                        Ok(analysis) => {
                            return Ok(CommandResponse {
                                success: true,
                                data: Some(serde_json::to_value(analysis).unwrap()),
                                error: None,
                            });
                        }
                        Err(e) => {
                            return Ok(CommandResponse {
                                success: false,
                                data: None,
                                error: Some(e.to_string()),
                            });
                        }
                    }
                }
            }
            Err(_) => {}
        }
    }

    let analysis = analyzer::analyze_binary_file(
        &file_name,
        file_size,
        mime_type.as_deref(),
    );

    Ok(CommandResponse {
        success: true,
        data: Some(serde_json::to_value(analysis).unwrap()),
        error: None,
    })
}

#[tauri::command]
async fn download_file(
    token: String,
    item_id: String,
) -> Result<CommandResponse, String> {
    match graph_api::download_file_content(&token, &item_id).await {
        Ok(bytes) => {
            use base64::Engine;
            let base64_data = base64::engine::general_purpose::STANDARD.encode(&bytes);
            Ok(CommandResponse {
                success: true,
                data: Some(serde_json::json!({ "data": base64_data })),
                error: None,
            })
        }
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

// ============ AI AGENT COMMANDS ============

#[tauri::command]
async fn chat_with_agent(
    agent_id: String,
    message: String,
    model_override: Option<String>,
    state: State<'_, AppState>,
) -> Result<CommandResponse, String> {
    // Use model_override if provided, otherwise use agent's default model
    let model = if let Some(override_model) = model_override {
        override_model
    } else {
        let agent_manager = state.agent_manager.lock().unwrap();
        match agent_manager.get_agent(&agent_id) {
            Some(agent) => agent.model.clone(),
            None => {
                return Ok(CommandResponse {
                    success: false,
                    data: None,
                    error: Some("Agent not found".to_string()),
                });
            }
        }
    };
    
    match ollama::chat_completion(&model, &message).await {
        Ok(response) => Ok(CommandResponse {
            success: true,
            data: Some(serde_json::json!({
                "agent_id": agent_id,
                "message": response
            })),
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(format!("Ollama error: {}", e)),
        }),
    }
}

#[tauri::command]
async fn list_agents(state: State<'_, AppState>) -> Result<CommandResponse, String> {
    let agent_manager = state.agent_manager.lock().unwrap();
    let agents = agent_manager.list_agents();
    
    Ok(CommandResponse {
        success: true,
        data: Some(serde_json::to_value(agents).unwrap()),
        error: None,
    })
}

#[tauri::command]async fn save_agents(
    agents: Vec<agent::Agent>,
    state: State<'_, AppState>,
) -> Result<CommandResponse, String> {
    let mut agent_manager = state.agent_manager.lock().unwrap();
    
    // Clear existing agents and add new ones
    *agent_manager = agent::AgentManager::new();
    for agent in agents {
        agent_manager.add_agent(agent);
    }
    
    // Save to file
    match agent_manager.save_to_file(&state.agents_config_path) {
        Ok(_) => Ok(CommandResponse {
            success: true,
            data: None,
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

#[tauri::command]
async fn reload_agents(state: State<'_, AppState>) -> Result<CommandResponse, String> {
    let new_manager = agent::AgentManager::load_from_config(Some(state.agents_config_path.clone()));
    let mut agent_manager = state.agent_manager.lock().unwrap();
    *agent_manager = new_manager;
    
    Ok(CommandResponse {
        success: true,
        data: None,
        error: None,
    })
}

#[tauri::command]async fn list_ollama_models() -> Result<CommandResponse, String> {
    match ollama::list_models().await {
        Ok(models) => Ok(CommandResponse {
            success: true,
            data: Some(serde_json::to_value(models).unwrap()),
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to list models: {}", e)),
        }),
    }
}

#[tauri::command]
async fn check_ollama() -> Result<CommandResponse, String> {
    let is_running = ollama::check_ollama_status().await;
    
    Ok(CommandResponse {
        success: true,
        data: Some(serde_json::json!({ "running": is_running })),
        error: None,
    })
}

// ============ FILE SYSTEM COMMANDS ============

#[tauri::command]
async fn read_directory(path: String) -> Result<CommandResponse, String> {
    match filesystem::read_directory(&path) {
        Ok(files) => Ok(CommandResponse {
            success: true,
            data: Some(serde_json::to_value(files).unwrap()),
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to read directory: {}", e)),
        }),
    }
}

#[tauri::command]
async fn read_file_content(path: String) -> Result<CommandResponse, String> {
    match filesystem::read_file(&path) {
        Ok(content) => Ok(CommandResponse {
            success: true,
            data: Some(serde_json::json!({ "content": content })),
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to read file: {}", e)),
        }),
    }
}

#[tauri::command]
async fn write_file_content(path: String, content: String) -> Result<CommandResponse, String> {
    match filesystem::write_file(&path, &content) {
        Ok(_) => Ok(CommandResponse {
            success: true,
            data: Some(serde_json::json!({ "message": "File written successfully" })),
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to write file: {}", e)),
        }),
    }
}

// Task Scheduler commands
#[tauri::command]
async fn create_task(
    state: State<'_, AppState>,
    name: String,
    agent_id: String,
    prompt_template: String,
    schedule_type: scheduler::ScheduleType,
) -> Result<CommandResponse, String> {
    let task = scheduler::Task {
        id: format!("task_{}", Utc::now().timestamp_millis()),
        name,
        agent_id,
        prompt_template,
        schedule_type,
        enabled: true,
        created_at: Utc::now(),
        last_run: None,
        next_run: None,
        run_count: 0,
    };

    match state.task_scheduler.add_task(task).await {
        Ok(task) => Ok(CommandResponse {
            success: true,
            data: Some(serde_json::to_value(task).unwrap()),
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

#[tauri::command]
async fn list_tasks(state: State<'_, AppState>) -> Result<CommandResponse, String> {
    let tasks = state.task_scheduler.get_tasks().await;
    Ok(CommandResponse {
        success: true,
        data: Some(serde_json::to_value(tasks).unwrap()),
        error: None,
    })
}

#[tauri::command]
async fn delete_task(state: State<'_, AppState>, task_id: String) -> Result<CommandResponse, String> {
    match state.task_scheduler.delete_task(&task_id).await {
        Ok(_) => Ok(CommandResponse {
            success: true,
            data: None,
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

#[tauri::command]
async fn toggle_task(
    state: State<'_, AppState>,
    task_id: String,
    enabled: bool,
) -> Result<CommandResponse, String> {
    match state.task_scheduler.toggle_task(&task_id, enabled).await {
        Ok(task) => Ok(CommandResponse {
            success: true,
            data: Some(serde_json::to_value(task).unwrap()),
            error: None,
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

#[tauri::command]
async fn get_task_results(
    state: State<'_, AppState>,
    limit: Option<usize>,
) -> Result<CommandResponse, String> {
    let results = state.task_scheduler.get_results(limit).await;
    Ok(CommandResponse {
        success: true,
        data: Some(serde_json::to_value(results).unwrap()),
        error: None,
    })
}

fn main() {
    let app_data_dir = tauri::api::path::app_data_dir(&tauri::Config::default())
        .unwrap_or_else(|| std::env::current_dir().unwrap());
    
    std::fs::create_dir_all(&app_data_dir).ok();
    
    // Setup paths for config files
    let tasks_file = app_data_dir.join("tasks.json");
    let agents_config = app_data_dir.join("agents.json");
    
    // Try to copy default agents.json if it doesn't exist in app data dir
    if !agents_config.exists() {
        // Try to find bundled agents.json
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(exe_dir) = current_exe.parent() {
                let bundled_agents = exe_dir.join("agents.json");
                if bundled_agents.exists() {
                    let _ = std::fs::copy(&bundled_agents, &agents_config);
                    println!("Copied bundled agents.json to app data directory");
                }
            }
        }
    }
    
    let task_scheduler = Arc::new(scheduler::TaskScheduler::new(tasks_file));
    
    // Load agents from config file (falls back to defaults if not found)
    let agent_manager = if agents_config.exists() {
        agent::AgentManager::load_from_config(Some(agents_config.clone()))
    } else {
        println!("No agents.json found, using default agents");
        agent::AgentManager::new()
    };
    
    tauri::Builder::default()
        .manage(AppState {
            agent_manager: Mutex::new(agent_manager),
            task_scheduler: task_scheduler.clone(),
            agents_config_path: agents_config,
        })
        .setup(move |_app| {
            // Start background task checker
            let scheduler_clone = task_scheduler.clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
                loop {
                    interval.tick().await;
                    scheduler_clone.check_and_run_tasks(|agent_id, prompt, _| {
                        // This is a simplified executor - in production, this would need proper async handling
                        Ok(format!("Task executed for agent {} with prompt: {}", agent_id, prompt))
                    }).await;
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // OneDrive API commands (kept for future use)
            store_token_secure,
            get_token_secure,
            delete_token_secure,
            has_stored_token,
            fetch_drive_items,
            fetch_user_profile,
            search_files,
            analyze_file,
            download_file,
            // AI Agent commands
            chat_with_agent,
            list_agents,
            save_agents,
            reload_agents,
            list_ollama_models,
            check_ollama,
            // File System commands
            read_directory,
            read_file_content,
            write_file_content,
            // Task Scheduler commands
            create_task,
            list_tasks,
            delete_task,
            toggle_task,
            get_task_results,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
