import React, { useState, useMemo, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Eye,
  Download,
  Trash2,
  Search,
  AlertCircle,
  X,
  FileQuestion,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck,
  Sparkles,
  Share2,
} from 'lucide-react';
import { SharedFile } from '../../types';

interface FilesManagerProps {
  files: SharedFile[];
  currentStudentName: string;
  isDarkMode?: boolean;
  onUploadFile: (file: { name: string; type: string; size: string; dataUrl: string }) => void;
  onDeleteFile: (fileId: string) => void;
}

export const FilesManager: React.FC<FilesManagerProps> = ({
  files,
  onUploadFile,
  onDeleteFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'pdf' | 'image' | 'other'>('all');
  const [previewFile, setPreviewFile] = useState<SharedFile | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = (file: File) => {
    setErrorMessage('');
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('File size exceeds 20MB limit. Please upload a smaller study document.');
      return;
    }

    setUploadProgress(25);
    const progressTimer = setInterval(() => {
      setUploadProgress((p) => {
        if (p === null || p >= 85) return p;
        return p + 15;
      });
    }, 120);

    const reader = new FileReader();
    reader.onload = () => {
      clearInterval(progressTimer);
      setUploadProgress(100);

      const sizeStr =
        file.size > 1024 * 1024
          ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
          : (file.size / 1024).toFixed(1) + ' KB';

      onUploadFile({
        name: file.name,
        type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
        size: sizeStr,
        dataUrl: reader.result as string,
      });

      setTimeout(() => {
        setUploadProgress(null);
      }, 500);
    };

    reader.onerror = () => {
      clearInterval(progressTimer);
      setUploadProgress(null);
      setErrorMessage('Failed to read file. Please try again.');
    };

    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const isPdf = f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf');
      const isImg = f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name);

      if (categoryFilter === 'pdf' && !isPdf) return false;
      if (categoryFilter === 'image' && !isImg) return false;
      if (categoryFilter === 'other' && (isPdf || isImg)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        f.name.toLowerCase().includes(q) ||
        f.uploadedBy.toLowerCase().includes(q)
      );
    });
  }, [files, searchQuery, categoryFilter]);

  const pdfCount = files.filter(
    (f) => f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf')
  ).length;
  const imgCount = files.filter(
    (f) => f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name)
  ).length;

  return (
    <div id="files-manager" className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900 overflow-hidden select-none transition-colors duration-150">
      {/* Header Bar */}
      <div className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base truncate">
              Study Guides & Shared Files
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
              Upload PDF past papers, formula sheets, diagrams, and revision guides
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs shadow-blue-600/20 flex-shrink-0"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Guide / PDF</span>
        </button>
      </div>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
        />

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-4 ring-blue-500/10'
              : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-white/80 dark:bg-slate-800/40'
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
              Drag and drop study files here, or <span className="text-blue-600 dark:text-blue-400 underline">browse files</span>
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Supports PDF exam papers, textbook chapters, formula charts, diagrams (up to 20MB)
            </p>
          </div>

          {uploadProgress !== null && (
            <div className="w-full max-w-xs mt-2">
              <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                <span>Uploading & syncing across room...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Categories and Search Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              All Files ({files.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('pdf')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'pdf'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              PDF Guides ({pdfCount})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('image')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'image'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              Images & Diagrams ({imgCount})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by file or student..."
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Files Grid Section */}
        <div>
          {filteredFiles.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <FileQuestion className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {searchQuery ? 'No files match your search' : 'No study files in this category'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Try clearing the search query or category filter'
                  : 'Upload past papers, study guides, or formulas to share with everyone in the room'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredFiles.map((file) => {
                const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
                const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);

                return (
                  <div
                    key={file.id}
                    className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 rounded-2xl shadow-xs hover:shadow-md transition flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                          isPdf
                            ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
                            : isImage
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60'
                            : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60'
                        }`}
                      >
                        {isPdf ? (
                          'PDF'
                        ) : isImage ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          title={file.name}
                          onClick={() => {
                            setZoomLevel(1);
                            setPreviewFile(file);
                          }}
                        >
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {file.size} • by <span className="font-medium text-slate-600 dark:text-slate-400">{file.uploadedBy}</span>
                        </p>
                      </div>
                    </div>

                    {/* Thumbnail preview snippet if image */}
                    {isImage && file.dataUrl && (
                      <div
                        onClick={() => {
                          setZoomLevel(1);
                          setPreviewFile(file);
                        }}
                        className="h-28 w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer"
                      >
                        <img
                          src={file.dataUrl}
                          alt={file.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-400 dark:text-slate-500">
                      <span>{file.uploadedAt}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setZoomLevel(1);
                            setPreviewFile(file);
                          }}
                          title="Preview document"
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={file.dataUrl}
                          download={file.name}
                          title="Download file"
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidateId(file.id)}
                          title="Delete file"
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* In-Room Full Preview Modal (PDF and Image) */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all ${
              isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-4xl max-h-[90vh]'
            }`}
          >
            {/* Modal Header Bar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="min-w-0 pr-4 flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    previewFile.type.includes('pdf') || previewFile.name.toLowerCase().endsWith('.pdf')
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                      : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {previewFile.type.includes('pdf') || previewFile.name.toLowerCase().endsWith('.pdf') ? 'PDF' : <ImageIcon className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                    {previewFile.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {previewFile.size} • Uploaded by {previewFile.uploadedBy}
                  </p>
                </div>
              </div>

              {/* Viewer Controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Zoom Controls for Images */}
                {(previewFile.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(previewFile.name)) && (
                  <div className="hidden sm:flex items-center gap-1 mr-2 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="p-1 hover:text-slate-900 dark:hover:text-white"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      className="p-1 hover:text-slate-900 dark:hover:text-white"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Toggle fullscreen */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer hidden sm:block"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                <a
                  href={previewFile.dataUrl}
                  download={previewFile.name}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewFile(null);
                    setIsFullscreen(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Content View Area */}
            <div className="flex-1 p-3 sm:p-6 overflow-auto flex items-center justify-center bg-slate-100/70 dark:bg-slate-950">
              {previewFile.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(previewFile.name) ? (
                <div className="overflow-auto max-h-full max-w-full flex items-center justify-center p-2">
                  <img
                    src={previewFile.dataUrl}
                    alt={previewFile.name}
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                    className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 transition-transform duration-150"
                  />
                </div>
              ) : previewFile.name.toLowerCase().endsWith('.pdf') || previewFile.type.includes('pdf') ? (
                <div className="w-full h-full min-h-[65vh] flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-white">
                  <iframe
                    src={`${previewFile.dataUrl}#toolbar=1&navpanes=1`}
                    title={previewFile.name}
                    className="w-full flex-1 h-[70vh] border-0"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400 max-w-sm">
                  <FileText className="w-16 h-16 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {previewFile.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Study Guide Document</p>
                  <a
                    href={previewFile.dataUrl}
                    download={previewFile.name}
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download to Open</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                Delete this study file?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This will delete the file for all students in this room.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidateId(null)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteFile(deleteCandidateId);
                  setDeleteCandidateId(null);
                }}
                className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
