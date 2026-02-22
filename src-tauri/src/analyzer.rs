use anyhow::Result;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileAnalysis {
    pub file_name: String,
    pub file_size: u64,
    pub line_count: usize,
    pub word_count: usize,
    pub char_count: usize,
    pub top_keywords: Vec<String>,
    pub summary: String,
}

pub fn analyze_text_content(file_name: &str, file_size: u64, content: &str) -> Result<FileAnalysis> {
    let lines: Vec<&str> = content.lines().collect();
    let line_count = lines.len();
    let words: Vec<&str> = content.split_whitespace().collect();
    let word_count = words.len();
    let char_count = content.len();
    let top_keywords = extract_keywords(content, 10);
    let summary = generate_summary(file_name, file_size, line_count, word_count, &top_keywords);

    Ok(FileAnalysis {
        file_name: file_name.to_string(),
        file_size,
        line_count,
        word_count,
        char_count,
        top_keywords,
        summary,
    })
}

fn extract_keywords(text: &str, top_n: usize) -> Vec<String> {
    let stop_words: Vec<&str> = vec![
        "the", "be", "to", "of", "and", "a", "in", "that", "have",
        "it", "for", "not", "on", "with", "he", "as", "you", "do",
        "at", "this", "but", "his", "by", "from", "they", "we",
    ];

    let re = Regex::new(r"\b[a-zA-Z]{4,}\b").unwrap();
    let mut word_freq: HashMap<String, usize> = HashMap::new();

    for cap in re.find_iter(text) {
        let word = cap.as_str().to_lowercase();
        if !stop_words.contains(&word.as_str()) {
            *word_freq.entry(word).or_insert(0) += 1;
        }
    }

    let mut sorted: Vec<(String, usize)> = word_freq.into_iter().collect();
    sorted.sort_by(|a, b| b.1.cmp(&a.1));

    sorted.into_iter().take(top_n).map(|(word, _)| word).collect()
}

fn generate_summary(file_name: &str, file_size: u64, line_count: usize, word_count: usize, keywords: &[String]) -> String {
    let size_str = format_file_size(file_size);
    
    let mut summary = format!(
        "📄 File: {}\n📦 Size: {}\n📊 Statistics:\n  • {} lines\n  • {} words\n  • {} characters\n",
        file_name, size_str, line_count, word_count, line_count * 50
    );

    if !keywords.is_empty() {
        summary.push_str("\n🔑 Key Terms:\n");
        for (i, keyword) in keywords.iter().take(5).enumerate() {
            summary.push_str(&format!("  {}. {}\n", i + 1, keyword));
        }
    }

    summary.push_str("\n💡 This document ");
    if word_count < 100 {
        summary.push_str("is relatively short and concise.");
    } else if word_count < 1000 {
        summary.push_str("contains moderate content suitable for quick review.");
    } else {
        summary.push_str("is substantial and may require focused reading time.");
    }

    summary
}

fn format_file_size(bytes: u64) -> String {
    const UNITS: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    if bytes == 0 {
        return "0 B".to_string();
    }

    let i = (bytes as f64).log(1024.0).floor() as usize;
    let size = bytes as f64 / 1024_f64.powi(i as i32);

    format!("{:.2} {}", size, UNITS[i.min(4)])
}

pub fn analyze_binary_file(file_name: &str, file_size: u64, mime_type: Option<&str>) -> FileAnalysis {
    let file_type = mime_type.unwrap_or("unknown");
    let category = categorize_file(file_name, file_type);

    let summary = format!(
        "📄 File: {}\n📦 Size: {}\n📋 Type: {}\n🏷️ Category: {}\n\n💡 This is a {} file.",
        file_name,
        format_file_size(file_size),
        file_type,
        category,
        category.to_lowercase()
    );

    FileAnalysis {
        file_name: file_name.to_string(),
        file_size,
        line_count: 0,
        word_count: 0,
        char_count: 0,
        top_keywords: vec![],
        summary,
    }
}

fn categorize_file(file_name: &str, mime_type: &str) -> &'static str {
    let lower_name = file_name.to_lowercase();
    
    if mime_type.contains("image") || lower_name.ends_with(".jpg") || lower_name.ends_with(".png") {
        return "Image";
    }
    
    if mime_type.contains("video") || lower_name.ends_with(".mp4") {
        return "Video";
    }
    
    if mime_type.contains("pdf") || lower_name.ends_with(".pdf") {
        return "PDF Document";
    }
    
    if mime_type.contains("word") || lower_name.ends_with(".docx") {
        return "Word Document";
    }
    
    "Binary File"
}
