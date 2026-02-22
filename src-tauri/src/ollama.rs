use reqwest;
use serde::{Deserialize, Serialize};
use anyhow::Result;

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaResponse {
    #[serde(default)]
    pub model: Option<String>,
    pub response: String,
    pub done: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ModelInfo {
    pub name: String,
    #[serde(default)]
    pub size: u64,
    #[serde(default)]
    pub modified_at: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ModelsResponse {
    pub models: Vec<ModelInfo>,
}

pub async fn chat_completion(model: &str, prompt: &str) -> Result<String> {
    let client = reqwest::Client::new();
    let request = OllamaRequest {
        model: model.to_string(),
        prompt: prompt.to_string(),
        stream: false,
    };

    let response = client
        .post("http://localhost:11434/api/generate")
        .json(&request)
        .send()
        .await?;

    let text = response.text().await?;
    let ollama_response: OllamaResponse = serde_json::from_str(&text)
        .map_err(|e| anyhow::anyhow!("Failed to parse Ollama response: {}. Response: {}", e, text))?;
    
    Ok(ollama_response.response)
}

pub async fn list_models() -> Result<Vec<ModelInfo>> {
    let client = reqwest::Client::new();
    let response = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await?;

    let models_response: ModelsResponse = response.json().await?;
    Ok(models_response.models)
}

pub async fn check_ollama_status() -> bool {
    let client = reqwest::Client::new();
    match client.get("http://localhost:11434/api/tags").send().await {
        Ok(_) => true,
        Err(_) => false,
    }
}
