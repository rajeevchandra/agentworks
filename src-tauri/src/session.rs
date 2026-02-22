use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: DateTime<Utc>,
    pub agent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub name: String,
    pub messages: Vec<SessionMessage>,
    pub agent_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub message_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMetadata {
    pub id: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub message_count: usize,
    pub agent_id: Option<String>,
}

pub struct SessionManager {
    sessions_dir: PathBuf,
}

impl SessionManager {
    pub fn new(sessions_dir: PathBuf) -> Self {
        fs::create_dir_all(&sessions_dir).ok();
        SessionManager { sessions_dir }
    }

    pub fn save_session(&self, session: Session) -> Result<(), String> {
        let file_path = self.sessions_dir.join(format!("{}.json", session.id));
        let json = serde_json::to_string_pretty(&session)
            .map_err(|e| format!("Failed to serialize session: {}", e))?;
        
        fs::write(&file_path, json)
            .map_err(|e| format!("Failed to write session file: {}", e))?;
        
        Ok(())
    }

    pub fn load_session(&self, session_id: &str) -> Result<Session, String> {
        let file_path = self.sessions_dir.join(format!("{}.json", session_id));
        
        if !file_path.exists() {
            return Err(format!("Session '{}' not found", session_id));
        }

        let contents = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read session file: {}", e))?;
        
        let session: Session = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse session file: {}", e))?;
        
        Ok(session)
    }

    pub fn list_sessions(&self) -> Result<Vec<SessionMetadata>, String> {
        let mut sessions = Vec::new();

        let entries = fs::read_dir(&self.sessions_dir)
            .map_err(|e| format!("Failed to read sessions directory: {}", e))?;

        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(contents) = fs::read_to_string(&path) {
                        if let Ok(session) = serde_json::from_str::<Session>(&contents) {
                            sessions.push(SessionMetadata {
                                id: session.id,
                                name: session.name,
                                created_at: session.created_at,
                                updated_at: session.updated_at,
                                message_count: session.message_count,
                                agent_id: session.agent_id,
                            });
                        }
                    }
                }
            }
        }

        // Sort by updated_at descending (most recent first)
        sessions.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

        Ok(sessions)
    }

    pub fn delete_session(&self, session_id: &str) -> Result<(), String> {
        let file_path = self.sessions_dir.join(format!("{}.json", session_id));
        
        if !file_path.exists() {
            return Err(format!("Session '{}' not found", session_id));
        }

        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete session file: {}", e))?;
        
        Ok(())
    }

    pub fn export_session(&self, session_id: &str, export_path: &str) -> Result<(), String> {
        let session = self.load_session(session_id)?;
        
        let json = serde_json::to_string_pretty(&session)
            .map_err(|e| format!("Failed to serialize session: {}", e))?;
        
        fs::write(export_path, json)
            .map_err(|e| format!("Failed to write export file: {}", e))?;
        
        Ok(())
    }

    pub fn import_session(&self, import_path: &str) -> Result<Session, String> {
        let contents = fs::read_to_string(import_path)
            .map_err(|e| format!("Failed to read import file: {}", e))?;
        
        let mut session: Session = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse import file: {}", e))?;
        
        // Generate new ID to avoid conflicts
        session.id = format!("session_{}", Utc::now().timestamp_millis());
        session.updated_at = Utc::now();
        
        self.save_session(session.clone())?;
        
        Ok(session)
    }
}
