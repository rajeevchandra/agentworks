use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub role: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub model: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Task {
    pub id: String,
    pub agent_id: String,
    pub prompt: String,
    pub status: TaskStatus,
    pub result: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum TaskStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

pub struct AgentManager {
    agents: HashMap<String, Agent>,
}

impl AgentManager {
    pub fn new() -> Self {
        Self::load_from_config(None)
    }

    pub fn load_from_config(config_path: Option<PathBuf>) -> Self {
        let mut agents = HashMap::new();
        
        // Try to load from config file
        if let Some(path) = config_path {
            if let Ok(contents) = fs::read_to_string(&path) {
                if let Ok(agent_list) = serde_json::from_str::<Vec<Agent>>(&contents) {
                    for agent in agent_list {
                        agents.insert(agent.id.clone(), agent);
                    }
                    println!("Loaded {} agents from config file", agents.len());
                    return AgentManager { agents };
                } else {
                    eprintln!("Failed to parse agents config file, using defaults");
                }
            }
        }
        
        // Fallback to default agents if config not found or failed to load
        agents.insert(
            "general".to_string(),
            Agent {
                id: "general".to_string(),
                name: "General Assistant".to_string(),
                role: "general".to_string(),
                description: "General purpose AI assistant for various tasks".to_string(),
                capabilities: vec![
                    "conversation".to_string(),
                    "reasoning".to_string(),
                    "analysis".to_string(),
                ],
                model: "llama3.2".to_string(),
            },
        );

        agents.insert(
            "coder".to_string(),
            Agent {
                id: "coder".to_string(),
                name: "Code Assistant".to_string(),
                role: "coder".to_string(),
                description: "Specialized in programming, code review, and debugging".to_string(),
                capabilities: vec![
                    "code_generation".to_string(),
                    "code_review".to_string(),
                    "debugging".to_string(),
                    "refactoring".to_string(),
                ],
                model: "codellama".to_string(),
            },
        );

        agents.insert(
            "analyst".to_string(),
            Agent {
                id: "analyst".to_string(),
                name: "Data Analyst".to_string(),
                role: "analyst".to_string(),
                description: "Analyzes data, files, and provides insights".to_string(),
                capabilities: vec![
                    "file_analysis".to_string(),
                    "data_processing".to_string(),
                    "visualization".to_string(),
                ],
                model: "llama3.2".to_string(),
            },
        );

        println!("Using {} default agents", agents.len());
        AgentManager { agents }
    }

    pub fn get_agent(&self, id: &str) -> Option<&Agent> {
        self.agents.get(id)
    }

    pub fn list_agents(&self) -> Vec<&Agent> {
        self.agents.values().collect()
    }

    pub fn add_agent(&mut self, agent: Agent) {
        self.agents.insert(agent.id.clone(), agent);
    }

    pub fn remove_agent(&mut self, id: &str) -> bool {
        self.agents.remove(id).is_some()
    }

    pub fn update_agent(&mut self, agent: Agent) -> bool {
        if self.agents.contains_key(&agent.id) {
            self.agents.insert(agent.id.clone(), agent);
            true
        } else {
            false
        }
    }

    pub fn save_to_file(&self, path: &PathBuf) -> Result<(), String> {
        let agents_vec: Vec<&Agent> = self.agents.values().collect();
        let json = serde_json::to_string_pretty(&agents_vec)
            .map_err(|e| format!("Failed to serialize agents: {}", e))?;
        
        fs::write(path, json)
            .map_err(|e| format!("Failed to write agents file: {}", e))?;
        
        Ok(())
    }
}
