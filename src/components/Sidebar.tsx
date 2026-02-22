import React from 'react';
import { LogOut, User, HelpCircle } from 'lucide-react';

interface SidebarProps {
  user: any;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">OneDrive AI</h1>
        <p className="text-sm text-gray-400 mt-1">Summarizer</p>
      </div>

      <div className="flex-1 p-4">
        <div className="space-y-2">
          <button className="w-full text-left px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
            My Files
          </button>
          <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
            Recent
          </button>
          <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
            Shared
          </button>
        </div>
      </div>

      {user && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.displayName}</p>
              <p className="text-xs text-gray-400 truncate">{user.mail || user.userPrincipalName}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
