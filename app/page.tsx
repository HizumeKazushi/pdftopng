'use client';

import { useState, useRef } from 'react';
import { FileText, Paperclip, Image, Upload, Download } from 'lucide-react';

interface ConvertedFile {
  name: string;
  url: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<{ message: string; files: ConvertedFile[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError('PDFファイルを選択してください');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', file);

    setConverting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || '変換に失敗しました');
      }
    } catch (err) {
      setError('エラーが発生しました: ' + (err as Error).message);
    } finally {
      setConverting(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!result) return;

    try {
      const response = await fetch('/api/download/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: result.files }),
      });

      if (!response.ok) throw new Error('一括ダウンロードに失敗しました');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted-images.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            PDF to PNG
          </h1>
          <p className="mt-2 text-gray-500 text-lg">
            PDFファイルをPNG画像に変換
          </p>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors duration-150
            ${isDragging 
              ? 'border-gray-900 bg-gray-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <FileText className="w-10 h-10 mx-auto mb-4 text-gray-400" strokeWidth={1.5} />
          <p className="text-gray-700 font-medium">
            ドラッグ&ドロップ、またはクリックして選択
          </p>
          <p className="text-gray-400 text-sm mt-1">PDF形式のみ</p>
        </div>

        {/* Selected File */}
        {file && (
          <div className="mt-4 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Paperclip className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                <span className="text-gray-900 font-medium">{file.name}</span>
              </div>
              <span className="text-gray-400 text-sm">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          </div>
        )}

        {/* Convert Button */}
        <button
          onClick={handleConvert}
          disabled={!file || converting}
          className={`
            w-full mt-6 py-3 rounded-lg font-medium transition-all duration-150
            ${!file || converting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-950'
            }
          `}
        >
          {converting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              変換中...
            </span>
          ) : (
            '変換する'
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-500 text-sm">
                {result.message}
              </p>
              <button
                onClick={handleDownloadAll}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 underline underline-offset-2"
              >
                <Download className="w-3 h-3" strokeWidth={1.5} />
                すべてダウンロード
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {result.files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Image className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                    <span className="text-gray-700">{file.name}</span>
                  </div>
                  <a
                    href={file.url}
                    download
                    className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2"
                  >
                    ダウンロード
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <p className="text-gray-400 text-sm text-center">
            PDFの各ページを個別のPNG画像に変換します
          </p>
        </div>
      </div>
    </div>
  );
}
