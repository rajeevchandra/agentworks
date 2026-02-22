import React, { useState, useEffect } from 'react';
import { X, Sparkles, FileText, Calendar, HardDrive } from 'lucide-react';
import { DriveItem } from '../types';
import { graphService } from '../services/graphService';

interface FileDetailPanelProps {
  file: DriveItem;
  onClose: () => void;
}

interface FileAnalysis {
  summary: string;
  word_count: number;
  line_count: number;
  keywords: string[];
  file_type: string;
}

export const FileDetailPanel: React.FC<FileDetailPanelProps> = ({ file, onClose }) => {
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    analyzeFile();
  }, [file.id]);

  const analyzeFile = async () => {
    try {
      setLoading(true);
      const result = await graphService.analyzeFile(
        file.id,
        file.name,
        file.file?.mimeType || 'application/octet-stream',
        file.size || 0
      );
      setAnalysis(result);
    } catch (error) {
      console.error('Failed to analyze file:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number | undefined): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-6 border-b border-gray-200 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{file.name}</h2>
          <p className="text-sm text-gray-500 mt-1">{file.file?.mimeType || 'Unknown type'}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* File Properties */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText size={16} />
            Properties
          </h3>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-gray-500">Size</dt>
              <dd className="text-sm text-gray-900 font-medium">{formatSize(file.size)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">{formatDate(file.createdDateTime)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Modified</dt>
              <dd className="text-sm text-gray-900">{formatDate(file.lastModifiedDateTime)}</dd>
            </div>
            {file.createdBy?.user?.displayName && (
              <div>
                <dt className="text-xs text-gray-500">Created by</dt>
                <dd className="text-sm text-gray-900">{file.createdBy.user.displayName}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* AI Analysis */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-600" />
            AI Analysis
          </h3>
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-700">{analysis.summary}</p>
              </div>

              {analysis.word_count > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Words</div>
                    <div className="text-lg font-semibold text-blue-600">{analysis.word_count.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Lines</div>
                    <div className="text-lg font-semibold text-green-600">{analysis.line_count.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {analysis.keywords.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Key Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <div className="text-xs text-gray-600 mb-1">File Type</div>
                <div className="text-sm font-medium text-gray-900">{analysis.file_type}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No analysis available</p>
          )}
        </div>
      </div>
    </div>
  );
};
