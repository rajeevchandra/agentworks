# AI Workforce Platform

A powerful desktop automation platform with local AI agents powered by Ollama. Built with Tauri and Rust for maximum performance and privacy.

## ✨ Features

### 🤖 AI Agents
- **Multiple Specialized Agents**: General Assistant, Code Assistant, Data Analyst
- **Model Picker**: Switch between any installed Ollama model in real-time
- **Custom Agent Creation**: Easily add new agents with specific roles

### 💬 Chat Interface
- **Claude-Inspired UI**: Beautiful dark theme with gradient effects
- **Session Management**: Save and load conversations with `/save` and `/load`
- **Real-Time Responses**: Streaming responses from local AI models

### 🔐 Permission Controls
- **File Operation Approval**: Review and approve all file system operations
- **Action Preview**: See exactly what agents want to do before allowing it
- **Safe by Default**: All destructive operations require explicit permission

### ⚡ Slash Commands
- `/read <filename>` - Read and analyze files with permission
- `/write <filename>` - Prepare to write content to files
- `/list [path]` - List directory contents with approval
- `/search <term>` - Search files for specific terms
- `/clear` - Clear conversation history
- `/save [name]` - Save current session to localStorage
- `/load <name>` - Load previously saved session
- `/help` - Show all available commands

### 📅 Task Scheduler
- **Automated Workflows**: Schedule agents to run at specific times
- **Multiple Schedule Types**: Interval, Hourly, Daily, Weekly
- **Task History**: Track all automated task executions
- **Enable/Disable**: Control task execution on the fly

### 📂 File System Access
- **Working Directory**: Set project root for file operations
- **Read/Write/List**: Full file system capabilities with permission controls
- **Path Intelligence**: Handles Windows, macOS, and Linux paths correctly

### 🎨 Modern UI
- **Gradient Effects**: Blue/purple/pink gradients throughout
- **Glass Morphism**: Translucent panels with backdrop blur
- **Smooth Animations**: Message appear effects and transitions
- **Responsive Design**: Beautiful on all screen sizes

### 🔒 Privacy & Performance
- **100% Local**: All AI processing on your machine
- **Native Speed**: Rust backend for lightning-fast responses
- **Small Footprint**: 3-8MB installers (vs 100MB+ Electron apps)
- **No Telemetry**: Zero data collection or tracking

## Prerequisites

- **Node.js** 18+ and npm
- **Rust** 1.70+ (install from https://rustup.rs/)
- **Ollama** (install from https://ollama.ai)

## Ollama Setup

1. **Download and Install Ollama**
   ```bash
   # Visit https://ollama.ai and download for your OS
   # Windows: Run the installer
   # macOS: brew install ollama
   # Linux: curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Pull AI Models**
   ```bash
   # For general conversation
   ollama pull llama3.2
   
   # For coding tasks
   ollama pull codellama
   
   # Check installed models
   ollama list
   ```

3. **Verify Ollama is Running**
   ```bash
   # Should return "Ollama is running"
   curl http://localhost:11434
   ```

## Installation

1. **Clone the repository**
   ```bash
   cd C:\projects\tauri-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Ollama** (if not already running)
   ```bash
   # Ollama usually starts automatically after installation
   # If not, run: ollama serve
   ```

4. **Build and run**
   ```bash
   npm run tauri dev
   ```

## Project Structure

```
tauri-app/
├── src/                          # React frontend
│   ├── App.tsx                   # Main chat interface with agents
│   ├── TaskScheduler.tsx         # Task automation UI
│   ├── PermissionDialog.tsx      # File operation approval dialog
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind CSS with custom animations
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri command handlers & setup
│   │   ├── ollama.rs             # Ollama API client
│   │   ├── agent.rs              # Agent management system
│   │   ├── scheduler.rs          # Task scheduling engine
│   │   ├── filesystem.rs         # File operations
│   │   ├── storage.rs            # Secure keyring storage
│   │   ├── graph_api.rs          # Microsoft Graph (dormant)
│   │   └── analyzer.rs           # File analysis (dormant)
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── package.json                  # Node.js dependencies
└── README.md                     # This file
```

## Available Agents

### 1. General Assistant (🧠)
- **Model**: llama3.2 (configurable via model picker)
- **Icon**: Brain icon in blue
- **Capabilities**: Conversation, reasoning, analysis
- **Use for**: General questions, brainstorming, explanations

### 2. Code Assistant (</>) 
- **Model**: codellama (configurable via model picker)
- **Icon**: Code icon in emerald green
- **Capabilities**: Code generation, review, debugging, refactoring
- **Use for**: Programming help, code reviews, technical questions

### 3. Data Analyst (📊)
- **Model**: llama3.2 (configurable via model picker)
- **Icon**: Bar chart icon in amber
- **Capabilities**: File analysis, data processing, insights
- **Use for**: Analyzing documents, extracting insights, data questions

## 🔧 Customizing Agents

Agents are loaded from `agents.json` at startup. You can customize or add new agents by editing this file.

**Location:**
- Development: `src-tauri/agents.json`
- Production: App data directory (e.g., `%APPDATA%\AI Workforce\agents.json`)

**Format:**
```json
[
  {
    "id": "custom-agent",
    "name": "Custom Agent",
    "role": "specialist",
    "description": "Your custom agent description",
    "capabilities": ["capability1", "capability2"],
    "model": "llama3.2"
  }
]
```

**Add a new agent:**
1. Edit `agents.json` in app data directory
2. Add your agent to the array
3. Restart the app
4. Your new agent will appear in the sidebar

**Fallback:** If `agents.json` is missing or invalid, the app uses hardcoded defaults (General, Code, Data Analyst).

## Rust Backend Commands

The Rust backend exposes these commands:

### AI Agent Commands
- `chat_with_agent(agent_id, message, model_override)` - Send message to agent with optional model override
- `list_agents()` - Get all available agents with capabilities
- `list_ollama_models()` - List all installed Ollama models
- `check_ollama()` - Verify Ollama is running on localhost:11434

### File System Commands (with Permission Controls)
- `read_directory(path)` - List files and folders in directory
- `read_file_content(path)` - Read file contents
- `write_file_content(path, content)` - Write content to file

### Task Scheduler Commands
- `create_task(name, agent_id, prompt_template, schedule_type)` - Create automated task
- `list_tasks()` - Get all scheduled tasks
- `delete_task(task_id)` - Remove scheduled task
- `toggle_task(task_id, enabled)` - Enable/disable task execution
- `get_task_results(limit)` - Get task execution history

### Legacy Commands (Available for Future Features)
- `store_token_secure()` - Secure credential storage (keyring)
- `get_token_secure()` - Retrieve stored credentials
- `fetch_drive_items()` - OneDrive integration (dormant)
- `analyze_file()` - File analysis capabilities (dormant)
## 🚀 Deployment

### Build for Production

```bash
# Build optimized app for your current platform
npm run tauri build
```

### Cross-Platform Support

**Windows:**
- `.exe` - NSIS installer
- `.msi` - Windows Installer package
- ~3-8MB installer size

**macOS:**
- `.app` - Application bundle
- `.dmg` - Disk image installer
- Universal binary (Intel + Apple Silicon)
- Must build on macOS

**Linux:**
- `.deb` - Debian/Ubuntu package
- `.AppImage` - Portable executable
- `.rpm` - Fedora/RedHat package
- Must build on Linux

**Build Output:** `src-tauri/target/release/bundle/`

### CI/CD
Use GitHub Actions to build for all platforms automatically:
- Windows builds on `windows-latest`
- macOS builds on `macos-latest`
- Linux builds on `ubuntu-latest`

## Technology Stack
## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling with custom animations
- **Vite** - Build tool and dev server with HMR
- **Lucide React** - Beautiful icon library

### Backend
- **Tauri 1.5** - Desktop app framework (native webview)
- **Rust** - Systems programming language
- **tokio** - Async runtime for concurrent operations
- **reqwest** - HTTP client for Ollama API
- **serde** - Serialization framework
- **chrono** - Date/time handling for scheduler
- **keyring** - OS-native secure storage

### AI/ML
- **Ollama** - Local LLM runtime (llama3.2, codellama, etc.)
- **No cloud dependencies** - 100% local processing

## Security & Privacy Features

- ✅ **100% Local Processing** - All AI runs on your machine
- ✅ **No Cloud Dependencies** - No data sent to external servers
- ✅ **Open Source Models** - Full transparency with Ollama
- ✅ **Permission Controls** - Approve all file operations before execution
- ✅ **Secure Storage** - OS-native credential storage (keyring)
- ✅ **Rust Safety** - Memory-safe backend prevents vulnerabilities
- ✅ **No Telemetry** - Zero tracking or data collection## 🛠️ Troubleshooting

### "Ollama Not Running"
- Install Ollama from https://ollama.ai
- Start Ollama: `ollama serve` (usually starts automatically)
- Verify: `curl http://localhost:11434`
- Pull a model: `ollama pull llama3.2`

### "No models available"
- Pull at least one model: `ollama pull llama3.2`
- Check installed models: `ollama list`
- Make sure Ollama has finished downloading

### "Build failed: Rust errors"
- Install Rust from https://rustup.rs/
- Restart your terminal after installation
- Run `rustc --version` to verify (need 1.70+)

### "Agent not responding"
- Check Ollama is running: `ollama list`
- Try pulling the model again: `ollama pull llama3.2`
- Check Ollama logs for errors
- Restart the app with `npm run tauri dev`

### "File operation failed"
- Ensure working directory is set (click folder icon)
- Check file path is correct (Windows: `\`, Unix: `/`)
- Approve the permission dialog when it appears
- Verify file exists: use `/list` command

### "Permission denied"
- Approve file operations in the permission dialog
- Check file/folder permissions on your OS
- Run app with appropriate user permissions

### "Hot reload not working"
- Frontend changes should be instant via Vite HMR
- Rust changes require ~5-15 seconds to recompile
- Check terminal for compilation errors

## 📋 Roadmap

### ✅ Completed (v1.0)
- [x] Chat interface with multiple AI agents
- [x] Ollama integration with model picker
- [x] File system access with permission controls
- [x] Slash commands (/read, /write, /list, etc.)
- [x] Session management (save/load conversations)
- [x] Task scheduler with automated workflows
- [x] Beautiful dark theme with gradients
- [x] Real-time model switching

### 🚧 In Progress (v1.1)
- [ ] `/write` command with agent-generated content
- [ ] `/search` command for file content search
- [ ] Agent collaboration (multi-agent workflows)
- [ ] Traffic monitoring/debugging panel

### 🔮 Future (v2.0)
- [ ] Custom agent creation UI
- [ ] Plugin system for extensions
- [ ] Desktop automation (clipboard, screenshots)
- [ ] Web scraping capabilities
- [ ] Multi-model support (GPT-4, Claude API)
- [ ] Agent memory and context persistence
- [ ] Keyboard shortcuts
- [ ] Theme customization
- [ ] Export conversations (PDF, Markdown)

## 📄 License

MIT License - Feel free to use, modify, and distribute!
