import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, Trash2, Plus, Calendar, TrendingUp } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

interface Task {
  id: string;
  name: string;
  agent_id: string;
  prompt_template: string;
  schedule_type: ScheduleType;
  enabled: boolean;
  created_at: string;
  last_run: string | null;
  next_run: string | null;
  run_count: number;
}

interface ScheduleType {
  type: 'Interval' | 'Hourly' | 'Daily' | 'Weekly';
  minutes?: number;
  at_minute?: number;
  at_hour?: number;
  day?: number;
}

interface TaskResult {
  task_id: string;
  task_name: string;
  agent_name: string;
  executed_at: string;
  prompt: string;
  response: string;
  success: boolean;
  error: string | null;
}

interface Agent {
  id: string;
  name: string;
  role: string;
}

interface TaskSchedulerProps {
  agents: Agent[];
  onClose: () => void;
}

const TaskScheduler: React.FC<TaskSchedulerProps> = ({ agents, onClose }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [results, setResults] = useState<TaskResult[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'results'>('tasks');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    agent_id: agents[0]?.id || '',
    prompt_template: '',
    scheduleType: 'Interval' as 'Interval' | 'Hourly' | 'Daily' | 'Weekly',
    minutes: 60,
    at_minute: 0,
    at_hour: 9,
    day: 1, // Monday
  });

  useEffect(() => {
    loadTasks();
    loadResults();
    const interval = setInterval(() => {
      loadTasks();
      loadResults();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    try {
      const response: any = await invoke('list_tasks');
      if (response.success && response.data) {
        setTasks(response.data);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadResults = async () => {
    try {
      const response: any = await invoke('get_task_results', { limit: 20 });
      if (response.success && response.data) {
        setResults(response.data);
      }
    } catch (error) {
      console.error('Failed to load results:', error);
    }
  };

  const createTask = async () => {
    if (!formData.name || !formData.prompt_template) {
      alert('Please fill in all required fields');
      return;
    }

    let schedule_type: any;
    switch (formData.scheduleType) {
      case 'Interval':
        schedule_type = { type: 'Interval', minutes: formData.minutes };
        break;
      case 'Hourly':
        schedule_type = { type: 'Hourly', at_minute: formData.at_minute };
        break;
      case 'Daily':
        schedule_type = { type: 'Daily', at_hour: formData.at_hour, at_minute: formData.at_minute };
        break;
      case 'Weekly':
        schedule_type = { type: 'Weekly', day: formData.day, at_hour: formData.at_hour, at_minute: formData.at_minute };
        break;
    }

    try {
      const response: any = await invoke('create_task', {
        name: formData.name,
        agentId: formData.agent_id,
        promptTemplate: formData.prompt_template,
        scheduleType: schedule_type,
      });

      if (response.success) {
        setShowCreateForm(false);
        setFormData({
          name: '',
          agent_id: agents[0]?.id || '',
          prompt_template: '',
          scheduleType: 'Interval',
          minutes: 60,
          at_minute: 0,
          at_hour: 9,
          day: 1,
        });
        loadTasks();
      } else {
        alert(`Failed to create task: ${response.error}`);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  };

  const toggleTask = async (taskId: string, enabled: boolean) => {
    try {
      await invoke('toggle_task', { taskId, enabled });
      loadTasks();
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await invoke('delete_task', { taskId });
      loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const formatSchedule = (schedule: ScheduleType): string => {
    switch (schedule.type) {
      case 'Interval':
        return `Every ${schedule.minutes} minutes`;
      case 'Hourly':
        return `Hourly at :${String(schedule.at_minute).padStart(2, '0')}`;
      case 'Daily':
        return `Daily at ${String(schedule.at_hour).padStart(2, '0')}:${String(schedule.at_minute).padStart(2, '0')}`;
      case 'Weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `${days[schedule.day || 0]} at ${String(schedule.at_hour).padStart(2, '0')}:${String(schedule.at_minute).padStart(2, '0')}`;
      default:
        return 'Unknown';
    }
  };

  const formatDate = (date: string | null): string => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-white/10">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Clock size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold gradient-text">Task Scheduler</h2>
              <p className="text-sm text-gray-400">Automate your AI agents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              activeTab === 'tasks' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Tasks ({tasks.length})
            {activeTab === 'tasks' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              activeTab === 'results' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            History ({results.length})
            {activeTab === 'results' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'tasks' && (
            <div>
              {/* Create Task Button */}
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full mb-6 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 font-semibold shadow-lg shadow-blue-500/20"
                >
                  <Plus size={20} />
                  Create New Task
                </button>
              )}

              {/* Create Task Form */}
              {showCreateForm && (
                <div className="mb-6 glass-effect rounded-xl p-6 border border-blue-500/30">
                  <h3 className="text-lg font-bold mb-4">Create New Task</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Task Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="e.g., Daily Code Review"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Agent</label>
                      <select
                        value={formData.agent_id}
                        onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      >
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>{agent.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Prompt Template</label>
                      <textarea
                        value={formData.prompt_template}
                        onChange={(e) => setFormData({ ...formData, prompt_template: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 h-24 resize-none"
                        placeholder="Use {date}, {time}, {datetime} as placeholders"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Schedule Type</label>
                      <select
                        value={formData.scheduleType}
                        onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value as any })}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Interval">Interval</option>
                        <option value="Hourly">Hourly</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                      </select>
                    </div>

                    {formData.scheduleType === 'Interval' && (
                      <div>
                        <label className="block text-sm font-semibold mb-2">Interval (minutes)</label>
                        <input
                          type="number"
                          value={formData.minutes}
                          onChange={(e) => setFormData({ ...formData, minutes: parseInt(e.target.value) || 0 })}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                          min="1"
                        />
                      </div>
                    )}

                    {(formData.scheduleType === 'Hourly' || formData.scheduleType === 'Daily' || formData.scheduleType === 'Weekly') && (
                      <>
                        {formData.scheduleType === 'Weekly' && (
                          <div>
                            <label className="block text-sm font-semibold mb-2">Day of Week</label>
                            <select
                              value={formData.day}
                              onChange={(e) => setFormData({ ...formData, day: parseInt(e.target.value) })}
                              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                            >
                              <option value="0">Sunday</option>
                              <option value="1">Monday</option>
                              <option value="2">Tuesday</option>
                              <option value="3">Wednesday</option>
                              <option value="4">Thursday</option>
                              <option value="5">Friday</option>
                              <option value="6">Saturday</option>
                            </select>
                          </div>
                        )}
                        
                        {(formData.scheduleType === 'Daily' || formData.scheduleType === 'Weekly') && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold mb-2">Hour (0-23)</label>
                              <input
                                type="number"
                                value={formData.at_hour}
                                onChange={(e) => setFormData({ ...formData, at_hour: parseInt(e.target.value) || 0 })}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                min="0"
                                max="23"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2">Minute (0-59)</label>
                              <input
                                type="number"
                                value={formData.at_minute}
                                onChange={(e) => setFormData({ ...formData, at_minute: parseInt(e.target.value) || 0 })}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                min="0"
                                max="59"
                              />
                            </div>
                          </div>
                        )}

                        {formData.scheduleType === 'Hourly' && (
                          <div>
                            <label className="block text-sm font-semibold mb-2">At Minute (0-59)</label>
                            <input
                              type="number"
                              value={formData.at_minute}
                              onChange={(e) => setFormData({ ...formData, at_minute: parseInt(e.target.value) || 0 })}
                              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                              min="0"
                              max="59"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={createTask}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all duration-300 font-semibold"
                    >
                      Create Task
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No scheduled tasks yet</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`glass-effect rounded-xl p-4 border ${
                        task.enabled ? 'border-blue-500/30' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg mb-1">{task.name}</h4>
                          <p className="text-sm text-gray-400 mb-2">{formatSchedule(task.schedule_type)}</p>
                          <p className="text-xs text-gray-500 line-clamp-2">{task.prompt_template}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleTask(task.id, !task.enabled)}
                            className={`p-2 rounded-lg transition-all duration-300 ${
                              task.enabled
                                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                            title={task.enabled ? 'Pause' : 'Resume'}
                          >
                            {task.enabled ? <Pause size={18} /> : <Play size={18} />}
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all duration-300"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-xs text-gray-400 pt-3 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} />
                          <span>Runs: {task.run_count}</span>
                        </div>
                        <div>Last: {formatDate(task.last_run)}</div>
                        {task.enabled && <div>Next: {formatDate(task.next_run)}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-4">
              {results.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No task results yet</p>
                </div>
              ) : (
                results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`glass-effect rounded-xl p-4 border ${
                      result.success ? 'border-green-500/30' : 'border-red-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold">{result.task_name}</h4>
                        <p className="text-xs text-gray-400">{result.agent_name}</p>
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(result.executed_at)}</div>
                    </div>
                    
                    <div className="text-sm text-gray-400 mb-2">
                      <strong>Prompt:</strong> {result.prompt}
                    </div>
                    
                    {result.success ? (
                      <div className="text-sm bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                        <strong className="text-green-400">Response:</strong>
                        <p className="mt-1 text-gray-300">{result.response}</p>
                      </div>
                    ) : (
                      <div className="text-sm bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                        <strong className="text-red-400">Error:</strong>
                        <p className="mt-1 text-gray-300">{result.error}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskScheduler;
