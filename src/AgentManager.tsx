import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { X, Plus, Edit2, Trash2, Save, AlertCircle } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  model: string;
}

interface AgentManagerProps {
  onClose: () => void;
  onAgentsUpdated: () => void;
}

export default function AgentManager({ onClose, onAgentsUpdated }: AgentManagerProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Agent>({
    id: '',
    name: '',
    role: '',
    description: '',
    capabilities: [],
    model: 'llama3.2'
  });

  useEffect(() => {
    loadAgents();
    loadModels();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await invoke('list_agents') as { success: boolean; data: Agent[] };
      if (response.success && response.data) {
        setAgents(response.data);
      }
    } catch (err) {
      setError(`Failed to load agents: ${err}`);
    }
  };

  const loadModels = async () => {
    try {
      const response = await invoke('list_ollama_models') as { success: boolean; data: any };
      if (response.success && response.data) {
        // Extract model names from the response (could be strings or objects with 'name' property)
        const models = Array.isArray(response.data) 
          ? response.data.map((item: any) => typeof item === 'string' ? item : item.name)
          : [];
        setAvailableModels(models);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const handleSaveAgents = async (updatedAgents: Agent[]) => {
    try {
      setError(null);
      const response = await invoke('save_agents', { agents: updatedAgents }) as { success: boolean; error?: string };
      if (response.success) {
        await invoke('reload_agents');
        await loadAgents();
        onAgentsUpdated();
        setIsCreating(false);
        setEditingAgent(null);
      } else {
        setError(response.error || 'Failed to save agents');
      }
    } catch (err) {
      setError(`Error saving agents: ${err}`);
    }
  };

  const handleCreateAgent = () => {
    setIsCreating(true);
    setEditingAgent(null);
    setFormData({
      id: `agent_${Date.now()}`,
      name: '',
      role: '',
      description: '',
      capabilities: [],
      model: availableModels[0] || 'llama3.2'
    });
  };

  const handleEditAgent = (agent: Agent) => {
    setError(null);
    setEditingAgent(agent);
    setIsCreating(false);
    setFormData({ ...agent });
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    const updatedAgents = agents.filter(a => a.id !== agentId);
    await handleSaveAgents(updatedAgents);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Agent name is required');
      return;
    }
    if (!formData.role.trim()) {
      setError('Agent role is required');
      return;
    }
    if (!formData.model.trim()) {
      setError('Model is required');
      return;
    }

    let updatedAgents: Agent[];
    if (isCreating) {
      // Check for duplicate ID
      if (agents.some(a => a.id === formData.id)) {
        setError('Agent ID already exists');
        return;
      }
      updatedAgents = [...agents, formData];
    } else if (editingAgent) {
      updatedAgents = agents.map(a => a.id === editingAgent.id ? formData : a);
    } else {
      return;
    }

    await handleSaveAgents(updatedAgents);
  };

  const handleCapabilitiesChange = (value: string) => {
    const caps = value.split(',').map(c => c.trim()).filter(c => c);
    setFormData({ ...formData, capabilities: caps });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900/95 to-purple-900/95 rounded-2xl border border-purple-500/30 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/30">
          <h2 className="text-2xl font-bold text-white">Agent Manager</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-200">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Agent List */}
          {!isCreating && !editingAgent && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Current Agents</h3>
                <button
                  onClick={handleCreateAgent}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium text-white flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Agent
                </button>
              </div>

              <div className="space-y-3">
                {agents.map(agent => (
                  <div
                    key={agent.id}
                    className="p-4 bg-white/5 border border-purple-500/20 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white">{agent.name}</h4>
                        <p className="text-purple-300 text-sm mt-1">{agent.role}</p>
                        <p className="text-gray-400 text-sm mt-2">{agent.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {agent.capabilities.map((cap, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                        <p className="text-gray-500 text-xs mt-2">Model: {agent.model}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditAgent(agent)}
                          className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAgent(agent.id)}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create/Edit Form */}
          {(isCreating || editingAgent) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                {isCreating ? 'Create New Agent' : `Edit Agent: ${formData.name}`}
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Agent ID {isCreating && <span className="text-gray-500">(auto-generated)</span>}
                </label>
                <input
                  type="text"
                  value={formData.id}
                  disabled
                  className="w-full px-4 py-2 bg-white/5 border border-purple-500/30 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., Code Assistant"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role *
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., Software Developer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none h-24 resize-none"
                  placeholder="Describe what this agent specializes in..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Capabilities <span className="text-gray-500">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={formData.capabilities.join(', ')}
                  onChange={e => handleCapabilitiesChange(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., coding, debugging, testing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Model *
                </label>
                <select
                  value={formData.model}
                  onChange={e => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  required
                >
                  {availableModels.length === 0 ? (
                    <option value={formData.model} className="bg-gray-900">
                      {formData.model}
                    </option>
                  ) : (
                    availableModels.map(model => (
                      <option key={model} value={model} className="bg-gray-900">
                        {model}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isCreating ? 'Create Agent' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingAgent(null);
                    setError(null);
                  }}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-purple-500/30 rounded-lg font-medium text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
