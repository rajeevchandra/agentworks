import React from 'react';
import { AlertTriangle, File, Trash2, Edit3, FolderOpen, Check, X } from 'lucide-react';

interface PermissionDialogProps {
  action: 'read' | 'write' | 'delete' | 'list';
  path: string;
  content?: string;
  onApprove: () => void;
  onDeny: () => void;
}

const PermissionDialog: React.FC<PermissionDialogProps> = ({ action, path, content, onApprove, onDeny }) => {
  const getActionDetails = () => {
    switch (action) {
      case 'read':
        return {
          title: 'Read File',
          icon: <File size={24} className="text-blue-400" />,
          description: 'Agent wants to read this file',
          color: 'blue',
        };
      case 'write':
        return {
          title: 'Write File',
          icon: <Edit3 size={24} className="text-amber-400" />,
          description: 'Agent wants to write to this file',
          color: 'amber',
        };
      case 'delete':
        return {
          title: 'Delete File',
          icon: <Trash2 size={24} className="text-red-400" />,
          description: 'Agent wants to delete this file',
          color: 'red',
        };
      case 'list':
        return {
          title: 'List Directory',
          icon: <FolderOpen size={24} className="text-green-400" />,
          description: 'Agent wants to list contents of this directory',
          color: 'green',
        };
    }
  };

  const details = getActionDetails();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl shadow-2xl w-full max-w-lg border border-white/10 animate-in fade-in duration-300">
        {/* Header */}
        <div className={`p-6 border-b border-white/10 flex items-center gap-4 bg-${details.color}-500/10`}>
          <div className={`p-3 bg-${details.color}-500/20 rounded-xl`}>
            <AlertTriangle size={32} className={`text-${details.color}-400`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Permission Required</h2>
            <p className="text-sm text-gray-400">{details.description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Action Type */}
          <div className="flex items-center gap-3 glass-effect rounded-xl p-4 border border-white/10">
            {details.icon}
            <div className="flex-1">
              <p className="text-xs text-gray-400 uppercase font-semibold">Action</p>
              <p className="text-white font-semibold">{details.title}</p>
            </div>
          </div>

          {/* File Path */}
          <div className="glass-effect rounded-xl p-4 border border-white/10">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Path</p>
            <p className="text-white font-mono text-sm break-all">{path}</p>
          </div>

          {/* Content Preview (for write operations) */}
          {content && action === 'write' && (
            <div className="glass-effect rounded-xl p-4 border border-white/10">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Content Preview</p>
              <div className="bg-black/30 rounded-lg p-3 max-h-48 overflow-auto">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                  {content.length > 500 ? content.substring(0, 500) + '...' : content}
                </pre>
              </div>
              {content.length > 500 && (
                <p className="text-xs text-gray-500 mt-2">
                  Showing first 500 characters of {content.length} total
                </p>
              )}
            </div>
          )}

          {/* Warning for dangerous actions */}
          {(action === 'delete' || action === 'write') && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-sm text-amber-300 flex items-center gap-2">
                <AlertTriangle size={16} />
                {action === 'delete' 
                  ? 'This action cannot be undone. The file will be permanently deleted.'
                  : 'This will modify or create the file. Existing content may be overwritten.'}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={onDeny}
            className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-2"
          >
            <X size={18} />
            Deny
          </button>
          <button
            onClick={onApprove}
            className={`flex-1 px-6 py-3 bg-gradient-to-r from-${details.color}-600 to-${details.color}-700 hover:from-${details.color}-700 hover:to-${details.color}-800 rounded-xl transition-all duration-300 font-semibold text-white shadow-lg shadow-${details.color}-500/20 flex items-center justify-center gap-2`}
          >
            <Check size={18} />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionDialog;
