"use client";

import { UploadCloud, File, X } from "lucide-react";
import { useRef, useState } from "react";

export default function StepDocuments({ data, updateData }: { data: any, updateData: (d: any) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newDocs = Array.from(files).map((file) => ({
      id: Math.random().toString(),
      name: file.name,
      size: formatSize(file.size),
      type: file.name.split(".").pop() ?? "file",
    }));
    updateData({ documents: [...data.documents, ...newDocs] });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    // Reset so same file can be re-selected if removed
    e.target.value = "";
  };

  const handleRemoveDoc = (id: string) => {
    updateData({
      documents: data.documents.filter((d: any) => d.id !== id)
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-600 text-white">Documents</h2>
        <p className="text-sm text-white/40">Upload files relevant to the meeting or specific agenda items.</p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Upload Zone */}
      <div 
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
          isDragging ? "border-indigo-500 bg-indigo-500/5" : "border-white/[0.1] hover:bg-white/[0.02]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
          <UploadCloud size={24} className="text-white/50" />
        </div>
        <p className="text-sm font-500 text-white mb-1">Drag and drop files here</p>
        <p className="text-xs text-white/40 mb-4">PDF, DOCX, XLSX up to 50MB</p>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-sm font-500 text-white/80 hover:bg-white/[0.1] transition-colors"
        >
          Browse Files
        </button>
      </div>

      {/* Document List */}
      {data.documents.length > 0 && (
        <div className="space-y-2 mt-6">
          <h3 className="text-sm font-500 text-white/70 mb-3">Uploaded Files</h3>
          {data.documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                  <File size={18} />
                </div>
                <div>
                  <p className="text-sm font-500 text-white">{doc.name}</p>
                  <p className="text-xs text-white/40">{doc.size}</p>
                </div>
              </div>
              <button 
                onClick={() => handleRemoveDoc(doc.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
