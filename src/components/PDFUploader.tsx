import { Upload, X } from 'lucide-react';
import { useRef } from 'react';

export interface PDFFileInfo {
  file: File;
  year: number;
  id: string;
}

interface PDFUploaderProps {
  files: PDFFileInfo[];
  onFilesChange: (files: PDFFileInfo[]) => void;
}

export function PDFUploader({ files, onFilesChange }: PDFUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: PDFFileInfo[] = selectedFiles
      .filter((file) => file.type === 'application/pdf')
      .map((file) => ({
        file,
        year: new Date().getFullYear(),
        id: Math.random().toString(36).substring(7),
      }));

    onFilesChange([...files, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleYearChange = (id: string, year: number) => {
    onFilesChange(
      files.map((f) => (f.id === id ? { ...f, year } : f))
    );
  };

  const handleRemove = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="pdf-upload"
        />
        <label htmlFor="pdf-upload" className="cursor-pointer">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600">
            Click to upload PDF files or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">PDF files only</p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-gray-700">Uploaded PDFs:</h3>
          {files.map((fileInfo) => (
            <div
              key={fileInfo.id}
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {fileInfo.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(fileInfo.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={fileInfo.year}
                  onChange={(e) =>
                    handleYearChange(fileInfo.id, parseInt(e.target.value))
                  }
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Year"
                />
                <button
                  onClick={() => handleRemove(fileInfo.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
