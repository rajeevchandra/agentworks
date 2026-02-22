use anyhow::{Result, anyhow};
use reqwest::Client;
use serde_json::Value;

const GRAPH_BASE_URL: &str = "https://graph.microsoft.com/v1.0";

pub async fn graph_request(token: &str, endpoint: &str) -> Result<Value> {
    let client = Client::new();
    let url = if endpoint.starts_with("http") {
        endpoint.to_string()
    } else {
        format!("{}{}", GRAPH_BASE_URL, endpoint)
    };

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await?;
        return Err(anyhow!("Graph API error {}: {}", status, error_text));
    }

    let json: Value = response.json().await?;
    Ok(json)
}

pub async fn download_file_content(token: &str, item_id: &str) -> Result<Vec<u8>> {
    let client = Client::new();
    let url = format!("{}/me/drive/items/{}/content", GRAPH_BASE_URL, item_id);

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(anyhow!("Failed to download file: {}", response.status()));
    }

    let bytes = response.bytes().await?;
    Ok(bytes.to_vec())
}
