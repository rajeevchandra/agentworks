import React from 'react';
import { File, Folder, FileText, Image, Music, Video, Archive } from 'lucide-react';
import { DriveItem } from '../types';

interface FileListProps {
  items: DriveItem[];
  onSelectFile: (item: DriveItem) => void;
  selectedFile: DriveItem | null;
}

const getFileIcon = (item: DriveItem) => {
  if (item.folder) return <Folder className="text-yellow-500" size={20} />;
  
  const name = item.name.toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.md')) return <FileText className="text-blue-500" size={20} />;
  if (name.match(/\.(jpg|jpeg|png|gif|svg)$/)) return <Image className="text-green-500" size={20} />;
  if (name.match(/\.(mp3|wav|ogg)$/)) return <Music className="text-purple-500" size={20} />;
  if (name.match(/\.(mp4|avi|mov|mkv)$/)) return <Video className="text-red-500" size={20} />;
  if (name.match(/\.(zip|rar|7z|tar|gz)$/)) return <Archive className="text-orange-500" size={20} />;
  
  return <File className="text-gray-500" size={20} />;
};

const formatSize = (bytes: number | undefined): string => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

export const FileList: React.FC<FileListProps> = ({ items, onSelectFile, selectedFile }) => {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Modified
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelectFile(item)}
              className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                selectedFile?.id === item.id ? 'bg-blue-100' : ''
              }`}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  {getFileIcon(item)}
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(item.lastModifiedDateTime)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatSize(item.size)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <Folder size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No files found</p>
          </div>
        </div>
      )}
    </div>
  );
};
