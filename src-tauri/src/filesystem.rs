use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use anyhow::Result;

#[derive(Serialize, Deserialize, Debug)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: String,
}

pub fn read_directory(path: &str) -> Result<Vec<FileInfo>> {
    let entries = fs::read_dir(path)?;
    let mut files = Vec::new();

    for entry in entries {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let path_buf = entry.path();
        
        let file_info = FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: path_buf.to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
            modified: format!("{:?}", metadata.modified()?),
        };
        
        files.push(file_info);
    }

    Ok(files)
}

pub fn read_file(path: &str) -> Result<String> {
    let content = fs::read_to_string(path)?;
    Ok(content)
}

pub fn write_file(path: &str, content: &str) -> Result<()> {
    fs::write(path, content)?;
    Ok(())
}

pub fn create_directory(path: &str) -> Result<()> {
    fs::create_dir_all(path)?;
    Ok(())
}

pub fn delete_file(path: &str) -> Result<()> {
    if PathBuf::from(path).is_dir() {
        fs::remove_dir_all(path)?;
    } else {
        fs::remove_file(path)?;
    }
    Ok(())
}
