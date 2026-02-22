import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Zap, AlertCircle, Folder, FileText, Sparkles, Settings, Brain, Code2, BarChart3 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import TaskScheduler from './TaskScheduler';
import PermissionDialog from './PermissionDialog';
import AgentManager from './AgentManager';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  model: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [ollamaRunning, setOllamaRunning] = useState(false);
  const [workingDir, setWorkingDir] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showAgentManager, setShowAgentManager] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [permissionRequest, setPermissionRequest] = useState<{
    action: 'read' | 'write' | 'delete' | 'list';
    path: string;
    content?: string;
    onApprove: () => void;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkOllama();
    loadAgents();
    loadModels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkOllama = async () => {
    try {
      const response: any = await invoke('check_ollama');
      setOllamaRunning(response.data?.running || false);
    } catch (error) {
      console.error('Failed to check Ollama:', error);
      setOllamaRunning(false);
    }
  };

  const loadAgents = async () => {
    try {
      const response: any = await invoke('list_agents');
      if (response.success && response.data) {
        setAgents(response.data);
        setSelectedAgent(response.data[0] || null);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadModels = async () => {
    try {
      const response: any = await invoke('list_ollama_models');
      if (response.success && response.data) {
        const modelNames = response.data.map((m: any) => m.name);
        setAvailableModels(modelNames);
        if (modelNames.length > 0 && !selectedModel) {
          setSelectedModel(modelNames[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const selectWorkingDirectory = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    
    if (selected && typeof selected === 'string') {
      setWorkingDir(selected);
      addSystemMessage(`Working directory set to: ${selected}`);
    }
  };

  // Get icon for each agent based on their role
  const getAgentIcon = (agentName: string) => {
    if (agentName.toLowerCase().includes('code')) {
      return <Code2 size={18} className="text-emerald-400" />;
    } else if (agentName.toLowerCase().includes('data') || agentName.toLowerCase().includes('analyst')) {
      return <BarChart3 size={18} className="text-amber-400" />;
    } else {
      return <Brain size={18} className="text-blue-400" />;
    }
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      id: Date.now().toString(),
      role: 'system',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedAgent || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      // Handle slash commands
      if (currentInput.startsWith('/')) {
        const [command, ...args] = currentInput.substring(1).split(' ');
        const argument = args.join(' ').trim();

        switch (command.toLowerCase()) {
          case 'read':
            if (!workingDir) {
              addSystemMessage('Please set a working directory first');
              break;
            }
            if (!argument) {
              addSystemMessage('Usage: /read <filename>');
              break;
            }
            await handleFileRead(argument);
            break;

          case 'write':
            if (!workingDir) {
              addSystemMessage('Please set a working directory first');
              break;
            }
            if (!argument) {
              addSystemMessage('Usage: /write <filename> (agent will provide content)');
              break;
            }
            addSystemMessage(`Use chat to tell the agent what content to write to ${argument}`);
            break;

          case 'list':
            if (!workingDir) {
              addSystemMessage('Please set a working directory first');
              break;
            }
            const dirPath = argument || workingDir;
            await handleDirectoryList(dirPath);
            break;

          case 'search':
            if (!workingDir) {
              addSystemMessage('Please set a working directory first');
              break;
            }
            if (!argument) {
              addSystemMessage('Usage: /search <term>');
              break;
            }
            addSystemMessage(`Searching for "${argument}" - feature coming soon`);
            break;

          case 'clear':
            setMessages([]);
            addSystemMessage('Conversation cleared');
            break;

          case 'save':
            const sessionName = argument || `session_${Date.now()}`;
            await handleSaveSession(sessionName);
            break;

          case 'load':
            if (!argument) {
              addSystemMessage('Usage: /load <session_name>');
              break;
            }
            await handleLoadSession(argument);
            break;

          case 'help':
            addSystemMessage(
              `Available Commands:\n\n` +
              `/read <filename>\n  Read and analyze a file\n\n` +
              `/write <filename>\n  Write content to a file (use chat to provide content)\n\n` +
              `/list [path]\n  List files in directory\n\n` +
              `/search <term>\n  Search files for term\n\n` +
              `/clear\n  Clear conversation history\n\n` +
              `/save [name]\n  Save current session\n\n` +
              `/load <name>\n  Load saved session\n\n` +
              `/help\n  Show this help message`
            );
            break;

          default:
            addSystemMessage(`Unknown command: /${command}. Type /help for available commands`);
        }
        setLoading(false);
        return;
      }

      // Regular chat message
      const response: any = await invoke('chat_with_agent', {
        agentId: selectedAgent.id,
        message: currentInput,
        modelOverride: selectedModel || null,
      });

      if (response.success && response.data) {
        addAssistantMessage(response.data.message);
      } else {
        throw new Error(response.error || 'Failed to get response');
      }
    } catch (error: any) {
      addAssistantMessage(`Error: ${error.message || 'Failed to communicate with agent'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileRead = async (fileName: string) => {
    // Use proper path separator for Windows
    const isWindows = workingDir.includes('\\');
    const separator = isWindows ? '\\' : '/';
    
    // Handle absolute paths
    const isAbsolute = fileName.includes(':') || fileName.startsWith('\\') || fileName.startsWith('/');
    const filePath = isAbsolute ? fileName : `${workingDir}${separator}${fileName}`;
    
    console.log('Reading file:', { workingDir, fileName, separator, filePath });
    
    return new Promise<void>((resolve) => {
      setPermissionRequest({
        action: 'read',
        path: filePath,
        onApprove: async () => {
          setPermissionRequest(null);
          try {
            const fileResponse: any = await invoke('read_file_content', { path: filePath });
            if (fileResponse.success) {
              const context = `File content of ${fileName}:\n\n${fileResponse.data.content}`;
              const response: any = await invoke('chat_with_agent', {
                agentId: selectedAgent!.id,
                message: `Analyze this file:\n\n${context}`,
                modelOverride: selectedModel || null,
              });

              if (response.success && response.data) {
                addAssistantMessage(response.data.message);
              }
            } else {
              addAssistantMessage(`Error reading file: ${fileResponse.error}`);
            }
          } catch (error: any) {
            addAssistantMessage(`Error: ${error.message}`);
          }
          resolve();
        },
      });
    });
  };

  const handleDirectoryList = async (dirPath: string) => {
    // If relative path, prepend workingDir
    const isWindows = workingDir.includes('\\');
    const separator = isWindows ? '\\' : '/';
    
    // Handle absolute paths
    const isAbsolute = dirPath.includes(':') || dirPath.startsWith('\\') || dirPath.startsWith('/');
    const fullPath = (isAbsolute || dirPath === workingDir) ? dirPath : `${workingDir}${separator}${dirPath}`;
    return new Promise<void>((resolve) => {
      setPermissionRequest({
        action: 'list',
        path: fullPath,
        onApprove: async () => {
          setPermissionRequest(null);
          try {
            const dirResponse: any = await invoke('read_directory', { path: fullPath });
            if (dirResponse.success && dirResponse.data) {
              const files = dirResponse.data.files;
              const fileList = files.map((f: any) => 
                `${f.is_dir ? '📁' : '📄'} ${f.name}`
              ).join('\n');
              addSystemMessage(`Contents of ${dirPath}:\n\n${fileList}`);
            } else {
              addSystemMessage(`Error listing directory: ${dirResponse.error}`);
            }
          } catch (error: any) {
            addSystemMessage(`Error: ${error.message}`);
          }
          resolve();
        },
      });
    });
  };

  const handleSaveSession = async (sessionName: string) => {
    try {
      const sessionData = {
        name: sessionName,
        messages,
        agent: selectedAgent,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`session_${sessionName}`, JSON.stringify(sessionData));
      addSystemMessage(`Session saved as "${sessionName}"`);
    } catch (error: any) {
      addSystemMessage(`Error saving session: ${error.message}`);
    }
  };

  const handleLoadSession = async (sessionName: string) => {
    try {
      const sessionData = localStorage.getItem(`session_${sessionName}`);
      if (!sessionData) {
        addSystemMessage(`Session "${sessionName}" not found`);
        return;
      }
      const parsed = JSON.parse(sessionData);
      setMessages(parsed.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })));
      addSystemMessage(`Session "${sessionName}" loaded (${parsed.messages.length} messages)`);
    } catch (error: any) {
      addSystemMessage(`Error loading session: ${error.message}`);
    }
  };

  const addAssistantMessage = (content: string) => {
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      agentId: selectedAgent?.id,
    };
    setMessages(prev => [...prev, assistantMessage]);
  };

  if (!ollamaRunning) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0a1a] to-[#0a0a1a] text-white flex items-center justify-center">
        <div className="text-center max-w-md px-6 animate-in fade-in duration-500">
          <div className="mb-8 relative">
            <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-full"></div>
            <AlertCircle size={80} className="mx-auto relative text-red-400 animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold mb-4 gradient-text">Ollama Not Running</h1>
          <p className="text-gray-400 mb-8 text-lg">
            Please install and start Ollama to unleash the power of local AI agents.
          </p>
          <div className="glass-effect rounded-2xl p-6 text-left mb-8">
            <p className="text-sm text-gray-300 mb-4 font-semibold">Quick Setup:</p>
            <ol className="text-sm text-gray-400 space-y-3 list-decimal list-inside">
              <li>Download Ollama from <a href="https://ollama.ai" className="text-blue-400 hover:text-blue-300 underline">ollama.ai</a></li>
              <li>Install and run Ollama</li>
              <li>Pull a model: <code className="bg-black/50 px-3 py-1 rounded-lg ml-2">ollama pull llama3.2</code></li>
              <li>Restart this app</li>
            </ol>
          </div>
          <button
            onClick={checkOllama}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl transition-all duration-300 font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0a15] to-[#0a0a0a] text-white flex">
      {/* Enhanced Sidebar */}
      <div className="w-80 glass-effect flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
        
        <div className="p-6 border-b border-white/10 relative">
          <h1 className="text-3xl font-bold mb-2 gradient-text">AgentWorks</h1>
          <p className="text-sm text-gray-400">Your Local AI Agent Platform</p>
        </div>

        {/* Working Directory */}
        <div className="p-4 border-b border-white/10 relative">
          <button
            onClick={selectWorkingDirectory}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 group"
          >
            <Folder size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
            <div className="flex-1 text-left">
              <p className="text-xs text-gray-500">Working Directory</p>
              <p className="text-sm truncate">{workingDir || 'Not set'}</p>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 relative">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Agents</h2>
            <Sparkles size={14} className="text-purple-400 animate-pulse" />
          </div>
          <div className="space-y-3">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-300 group ${
                  selectedAgent?.id === agent.id
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/50 shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${selectedAgent?.id === agent.id ? 'bg-blue-500/20' : 'bg-white/10'} group-hover:scale-110 transition-transform`}>
                    {getAgentIcon(agent.name)}
                  </div>
                  <span className="font-semibold">{agent.name}</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{agent.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.capabilities.slice(0, 3).map((cap, idx) => (
                    <span key={idx} className="text-xs bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                      {cap}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
              <span className="text-gray-400">Ollama Active</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <Settings size={18} className="text-gray-400" />
            </button>
          </div>
          
          {/* Agent Manager Button */}
          <button
            onClick={() => setShowAgentManager(true)}
            className="w-full flex items-center gap-3 px-4 py-3 mb-3 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/30 transition-all duration-300 group"
          >
            <Settings size={20} className="text-emerald-400 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-medium">Manage Agents</span>
          </button>
          
          {/* Scheduler Button */}
          <button
            onClick={() => setShowScheduler(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 transition-all duration-300 group"
          >
            <Zap size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">Task Scheduler</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Chat Header */}
        <div className="p-6 border-b border-white/10 glass-effect">
          {selectedAgent && (
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30">
                <Bot size={24} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{selectedAgent.name}</h2>
                <p className="text-sm text-gray-400">{selectedAgent.role} • Model: <span className="text-blue-400">{selectedAgent.model}</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-32 animate-in fade-in duration-700">
              <div className="mb-6 relative inline-block">
                <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>
                <Zap size={64} className="relative text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400" />
              </div>
              <p className="text-xl font-semibold mb-2 gradient-text">Ready to Assist</p>
              <p className="text-sm">Select an agent and start a conversation</p>
              {workingDir && (
                <p className="text-xs text-gray-600 mt-4">
                  Try: <code className="bg-white/5 px-2 py-1 rounded">/read filename.txt</code>
                </p>
              )}
            </div>
          )}

          {messages.map(message => (
            <div
              key={message.id}
              className={`flex gap-4 message-appear ${message.role === 'user' ? 'justify-end' : ''} ${
                message.role === 'system' ? 'justify-center' : ''
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                  <Bot size={20} />
                </div>
              )}
              
              {message.role === 'system' ? (
                <div className="glass-effect rounded-xl px-4 py-2 text-xs text-gray-400 border border-white/10">
                  <FileText size={12} className="inline mr-2" />
                  <span className="whitespace-pre-wrap">{message.content}</span>
                </div>
              ) : (
                <div
                  className={`max-w-2xl rounded-2xl px-6 py-4 shadow-lg ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-blue-500/30'
                      : 'glass-effect text-gray-100 border border-white/10'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className="text-xs mt-3 opacity-50">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              )}
              
              {message.role === 'user' && (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <User size={20} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-4 message-appear">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
                <Bot size={20} />
              </div>
              <div className="glass-effect rounded-2xl px-6 py-4 border border-white/10">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input */}
        <div className="p-6 border-t border-white/10 glass-effect">
          {/* Model Picker */}
          {availableModels.length > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm text-gray-400 font-semibold">Model:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 hover:bg-white/10 transition-all duration-300"
              >
                {availableModels.map((model) => (
                  <option key={model} value={model} className="bg-gray-900">
                    {model}
                  </option>
                ))}
              </select>
              <button
                onClick={loadModels}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 text-xs text-gray-400 hover:text-white"
                title="Refresh models"
              >
                🔄
              </button>
            </div>
          )}
          
          <form onSubmit={sendMessage} className="relative">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${selectedAgent?.name || 'agent'}...`}
                disabled={loading || !selectedAgent}
                className="relative w-full bg-white/5 text-white rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 disabled:opacity-50 transition-all duration-300 border border-white/10"
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || !selectedAgent}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Task Scheduler Modal */}
      {showScheduler && (
        <TaskScheduler 
          agents={agents} 
          onClose={() => setShowScheduler(false)} 
        />
      )}
      
      {/* Agent Manager Modal */}
      {showAgentManager && (
        <AgentManager
          onClose={() => setShowAgentManager(false)}
          onAgentsUpdated={loadAgents}
        />
      )}
      
      {/* Permission Dialog */}
      {permissionRequest && (
        <PermissionDialog
          action={permissionRequest.action}
          path={permissionRequest.path}
          content={permissionRequest.content}
          onApprove={permissionRequest.onApprove}
          onDeny={() => {
            setPermissionRequest(null);
            addSystemMessage('Permission denied');
            setLoading(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
