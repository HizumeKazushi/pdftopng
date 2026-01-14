'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileText, Loader2, Package } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-3">
              PDF to PNG
            </h1>
            <p className="text-lg text-gray-600">
              PDFファイルを高品質なPNG画像に変換
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            {/* Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${isDragging
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-purple-500' : 'text-gray-400'}`} />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                PDFファイルをドラッグ&ドロップ
              </p>
              <p className="text-gray-500 mb-4">または</p>
              <div className="inline-block px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium">
                ファイルを選択
              </div>
            </div>

            {/* Selected File */}
            {file && (
              <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span className="text-gray-700 font-medium">{file.name}</span>
                  <span className="text-sm text-gray-500 ml-auto">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
            )}

            {/* Convert Button */}
            <button
              onClick={handleConvert}
              disabled={!file || converting}
              className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {converting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  変換中...
                </>
              ) : (
                <>変換する</>
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Success Result */}
            {result && (
              <div className="mt-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-6">
                  <p className="text-green-800 font-semibold text-center">
                    ✓ {result.message}
                  </p>
                </div>

                {/* Download All Button */}
                <button
                  onClick={handleDownloadAll}
                  className="w-full mb-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  すべてダウンロード (ZIP)
                </button>

                {/* Individual Files */}
                <div className="space-y-3">
                  {result.files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-gray-700 font-medium">{file.name}</span>
                      <a
                        href={file.url}
                        download
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        ダウンロード
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>PDFの各ページを個別のPNG画像に変換します</p>
          </div>
        </div>
      </div>
    </div>
  );
}
