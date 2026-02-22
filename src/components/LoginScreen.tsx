import React from "react";
import { Loader2 } from "lucide-react";

interface LoginScreenProps {
  onLogin: () => void;
  isLoading: boolean;
  error?: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isLoading, error }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]">
      <div className="max-w-md w-full mx-4">
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">☁️</div>
            <h1 className="text-3xl font-bold text-white mb-2">OneDrive Summarizer</h1>
            <p className="text-gray-400">AI-powered file analysis</p>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={onLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              "Sign in with Microsoft"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
