use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::{DateTime, Utc, Duration, Datelike, Timelike};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub name: String,
    pub agent_id: String,
    pub prompt_template: String,
    pub schedule_type: ScheduleType,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
    pub last_run: Option<DateTime<Utc>>,
    pub next_run: Option<DateTime<Utc>>,
    pub run_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ScheduleType {
    Interval { minutes: u32 },
    Hourly { at_minute: u32 },
    Daily { at_hour: u32, at_minute: u32 },
    Weekly { day: u32, at_hour: u32, at_minute: u32 }, // 0=Sunday, 6=Saturday
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskResult {
    pub task_id: String,
    pub task_name: String,
    pub agent_name: String,
    pub executed_at: DateTime<Utc>,
    pub prompt: String,
    pub response: String,
    pub success: bool,
    pub error: Option<String>,
}

pub struct TaskScheduler {
    tasks: Arc<Mutex<HashMap<String, Task>>>,
    results: Arc<Mutex<Vec<TaskResult>>>,
    storage_path: PathBuf,
}

impl TaskScheduler {
    pub fn new(storage_path: PathBuf) -> Self {
        let scheduler = TaskScheduler {
            tasks: Arc::new(Mutex::new(HashMap::new())),
            results: Arc::new(Mutex::new(Vec::new())),
            storage_path,
        };
        
        // Load existing tasks
        if let Ok(tasks) = scheduler.load_tasks() {
            *scheduler.tasks.blocking_lock() = tasks;
        }
        
        scheduler
    }

    pub async fn add_task(&self, mut task: Task) -> Result<Task, String> {
        // Calculate next run time
        task.next_run = Some(self.calculate_next_run(&task.schedule_type));
        
        let mut tasks = self.tasks.lock().await;
        tasks.insert(task.id.clone(), task.clone());
        drop(tasks);
        
        self.save_tasks().await?;
        Ok(task)
    }

    pub async fn get_tasks(&self) -> Vec<Task> {
        let tasks = self.tasks.lock().await;
        tasks.values().cloned().collect()
    }

    pub async fn delete_task(&self, task_id: &str) -> Result<(), String> {
        let mut tasks = self.tasks.lock().await;
        tasks.remove(task_id);
        drop(tasks);
        
        self.save_tasks().await?;
        Ok(())
    }

    pub async fn toggle_task(&self, task_id: &str, enabled: bool) -> Result<Task, String> {
        let mut tasks = self.tasks.lock().await;
        
        if let Some(task) = tasks.get_mut(task_id) {
            task.enabled = enabled;
            if enabled {
                task.next_run = Some(self.calculate_next_run(&task.schedule_type));
            } else {
                task.next_run = None;
            }
            let updated_task = task.clone();
            drop(tasks);
            
            self.save_tasks().await?;
            Ok(updated_task)
        } else {
            Err("Task not found".to_string())
        }
    }

    pub async fn get_results(&self, limit: Option<usize>) -> Vec<TaskResult> {
        let results = self.results.lock().await;
        let limit = limit.unwrap_or(50);
        results.iter().rev().take(limit).cloned().collect()
    }

    pub async fn add_result(&self, result: TaskResult) {
        let mut results = self.results.lock().await;
        results.push(result);
        
        // Keep only last 100 results
        if results.len() > 100 {
            let len = results.len();
            results.drain(0..len - 100);
        }
    }

    pub async fn check_and_run_tasks<F>(&self, executor: F)
    where
        F: Fn(String, String, String) -> Result<String, String>,
    {
        let now = Utc::now();
        let mut tasks_to_run = Vec::new();
        
        {
            let mut tasks = self.tasks.lock().await;
            for task in tasks.values_mut() {
                if task.enabled {
                    if let Some(next_run) = task.next_run {
                        if next_run <= now {
                            tasks_to_run.push(task.clone());
                            task.last_run = Some(now);
                            task.run_count += 1;
                            task.next_run = Some(self.calculate_next_run(&task.schedule_type));
                        }
                    }
                }
            }
        }
        
        if tasks_to_run.is_empty() {
            return;
        }
        
        // Execute tasks
        for task in &tasks_to_run {
            let prompt = self.render_prompt(&task.prompt_template);
            match executor(task.agent_id.clone(), prompt.clone(), String::new()) {
                Ok(response) => {
                    self.add_result(TaskResult {
                        task_id: task.id.clone(),
                        task_name: task.name.clone(),
                        agent_name: task.agent_id.clone(),
                        executed_at: now,
                        prompt,
                        response,
                        success: true,
                        error: None,
                    }).await;
                }
                Err(error) => {
                    self.add_result(TaskResult {
                        task_id: task.id.clone(),
                        task_name: task.name.clone(),
                        agent_name: task.agent_id.clone(),
                        executed_at: now,
                        prompt,
                        response: String::new(),
                        success: false,
                        error: Some(error),
                    }).await;
                }
            }
        }
        
        let _ = self.save_tasks().await;
    }

    fn calculate_next_run(&self, schedule_type: &ScheduleType) -> DateTime<Utc> {
        let now = Utc::now();
        
        match schedule_type {
            ScheduleType::Interval { minutes } => {
                now + Duration::minutes(*minutes as i64)
            }
            ScheduleType::Hourly { at_minute } => {
                let mut next = now;
                next = next.with_minute(*at_minute).unwrap_or(now);
                next = next.with_second(0).unwrap_or(now);
                
                if next <= now {
                    next = next + Duration::hours(1);
                }
                next
            }
            ScheduleType::Daily { at_hour, at_minute } => {
                let mut next = now;
                next = next.with_hour(*at_hour).unwrap_or(now);
                next = next.with_minute(*at_minute).unwrap_or(now);
                next = next.with_second(0).unwrap_or(now);
                
                if next <= now {
                    next = next + Duration::days(1);
                }
                next
            }
            ScheduleType::Weekly { day, at_hour, at_minute } => {
                let mut next = now;
                next = next.with_hour(*at_hour).unwrap_or(now);
                next = next.with_minute(*at_minute).unwrap_or(now);
                next = next.with_second(0).unwrap_or(now);
                
                let current_day = next.weekday().num_days_from_sunday();
                let days_until_target = if *day >= current_day {
                    day - current_day
                } else {
                    7 - (current_day - day)
                };
                
                next = next + Duration::days(days_until_target as i64);
                
                if next <= now {
                    next = next + Duration::days(7);
                }
                next
            }
        }
    }

    fn render_prompt(&self, template: &str) -> String {
        let now = Utc::now();
        template
            .replace("{date}", &now.format("%Y-%m-%d").to_string())
            .replace("{time}", &now.format("%H:%M:%S").to_string())
            .replace("{datetime}", &now.format("%Y-%m-%d %H:%M:%S").to_string())
    }

    async fn save_tasks(&self) -> Result<(), String> {
        let tasks = self.tasks.lock().await;
        let json = serde_json::to_string_pretty(&*tasks)
            .map_err(|e| format!("Failed to serialize tasks: {}", e))?;
        
        fs::write(&self.storage_path, json)
            .map_err(|e| format!("Failed to write tasks file: {}", e))?;
        
        Ok(())
    }

    fn load_tasks(&self) -> Result<HashMap<String, Task>, String> {
        if !self.storage_path.exists() {
            return Ok(HashMap::new());
        }
        
        let contents = fs::read_to_string(&self.storage_path)
            .map_err(|e| format!("Failed to read tasks file: {}", e))?;
        
        let tasks: HashMap<String, Task> = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse tasks file: {}", e))?;
        
        Ok(tasks)
    }
}
