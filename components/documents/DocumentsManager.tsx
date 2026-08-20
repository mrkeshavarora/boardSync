"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  FileText, Download, Upload, Eye, FileUp, Database,
  Calendar, Loader2, AlertCircle, FileSpreadsheet, FileCode,
  Image as ImageIcon, MoreVertical, Trash2, X, Check, CheckSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import DocumentChat from "@/components/documents/DocumentChat";
import { isAllowedDocument } from "@/lib/documentValidation";

interface IDocument {
  _id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
  storageUrl: string;
  uploadedBy: any;
  createdAt: string;
}

interface MeetingSummary {
  _id: string;
  title: string;
  date: string;
}

const fileTypeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  "application/pdf": { icon: FileText, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  "text/markdown": { icon: FileCode, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  "text/x-markdown": { icon: FileCode, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  "text/plain": { icon: FileText, color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20" },
  "text/csv": { icon: FileSpreadsheet, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { icon: FileSpreadsheet, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  "application/vnd.ms-excel": { icon: FileSpreadsheet, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  "application/msword": { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  "application/vnd.ms-powerpoint": { icon: FileText, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { icon: FileText, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
};

function getFileTypeDetails(mimeType: string) {
  return fileTypeConfig[mimeType] || { icon: FileText, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" };
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function DocumentsManager() {
  const [meetingId, setMeetingId] = useState("");
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState<boolean | null>(null);

  const selectedDocs = useMemo(() => {
    return documents.filter((d) => selectedDocIds.includes(d._id));
  }, [documents, selectedDocIds]);

  const isAllSelected = documents.length > 0 && selectedDocIds.length === documents.length;

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map((d) => d._id));
    }
  };

  // Fetch Cloudinary config & meetings
  useEffect(() => {
    fetch("/api/cloudinary/config")
      .then((r) => r.json())
      .then((j) => setCloudinaryConfigured(!!j?.configured))
      .catch(() => setCloudinaryConfigured(false));

    fetch("/api/meetings?limit=50")
      .then((r) => r.json())
      .then((j) => setMeetings(j.meetings || []))
      .catch((e) => console.error("Error loading meetings", e));
  }, []);

  async function loadDocuments() {
    try {
      const endpoint = meetingId ? `/api/meetings/${meetingId}/documents` : `/api/documents`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to load documents");
      const data = await res.json();
      const docs = data.documents || [];
      setDocuments(docs);
      // By default select all loaded documents
      setSelectedDocIds(docs.map((d: IDocument) => d._id));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [meetingId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (!isAllowedDocument(droppedFile.name, droppedFile.type)) {
        alert("Only document files (PDF, Word, Excel, PowerPoint, Text, Markdown) are allowed. Images and videos are blocked.");
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!isAllowedDocument(selectedFile.name, selectedFile.type)) {
        alert("Only document files (PDF, Word, Excel, PowerPoint, Text, Markdown) are allowed. Images and videos are blocked.");
        return;
      }
      setFile(selectedFile);
    }
  };

  async function presignAndUpload() {
    if (!file) return;
    try {
      setLoading(true);
      
      const signRes = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: `meetings/${meetingId || 'general'}` }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) {
        throw new Error(signData.error || 'Signature generation failed');
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signData.api_key);
      formData.append("timestamp", signData.timestamp);
      formData.append("signature", signData.signature);
      formData.append("folder", signData.folder);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${signData.cloud_name}/auto/upload`;
      const uploadRes = await fetch(uploadUrl, { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      
      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message || 'Upload to Cloudinary failed');
      }

      // Save metadata in MongoDB
      const endpoint = meetingId ? `/api/meetings/${meetingId}/documents` : `/api/documents`;
      const payload = {
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        storageKey: uploadData.public_id,
        storageUrl: uploadData.secure_url
      };
      
      const metaRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!metaRes.ok) {
        const txt = await metaRes.text();
        console.warn('Metadata save failed', txt);
      }

      setFile(null);
      await loadDocuments();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  function previewDocument(doc: IDocument) {
    if (doc.fileType === "application/pdf") {
      setPreviewUrl(doc.storageUrl);
      setPreviewName(doc.fileName);
    } else {
      window.open(doc.storageUrl, "_blank");
    }
  }

  return (
    <div className="space-y-6">
      {cloudinaryConfigured === false && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 text-sm">
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p>Cloudinary is not configured. Uploads will fail until Cloudinary credentials are set in environment variables.</p>
        </div>
      )}

      {/* Select Meeting context */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-600 text-white">Select Meeting Scope</h4>
          <p className="text-xs text-white/40">Link your documents to a specific board meeting, or upload to general storage.</p>
        </div>
        <div className="relative min-w-[280px]">
          <select
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            className="w-full pl-3 pr-8 py-2.5 rounded-lg text-sm bg-[#0f172a] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer transition-colors"
          >
            <option value="" className="bg-[#0f172a] text-white">📁 General Documents (No Meeting)</option>
            {meetings.map((m) => (
              <option key={m._id} value={m._id} className="bg-[#0f172a] text-white">
                📅 {m.title} ({new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "rounded-2xl border-2 border-dashed p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer relative",
          isDragOver
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-white/[0.08] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.14]"
        )}
      >
        <input
          id="file-upload-input"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md"
          className="hidden"
          onChange={handleFileSelect}
        />
        <label htmlFor="file-upload-input" className="absolute inset-0 cursor-pointer z-10" />

        <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/50 mb-4 group-hover:text-white transition-colors relative z-0">
          <FileUp size={22} className={cn(loading && "animate-pulse")} />
        </div>

        {file ? (
          <div className="relative z-20 max-w-md space-y-3">
            <div>
              <p className="text-sm font-600 text-white truncate">{file.name}</p>
              <p className="text-xs text-white/40 mt-1">{formatBytes(file.size)}</p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-500 text-white/60 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                Clear
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  presignAndUpload();
                }}
                disabled={loading}
                className="btn-gradient px-4 py-1.5 rounded-lg text-xs font-600 flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 disabled:opacity-60"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {loading ? "Uploading..." : "Start Upload"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1 relative z-20 pointer-events-none">
            <p className="text-sm font-500 text-white">Drag & drop your file here, or <span className="text-indigo-400 font-600">Browse Files</span></p>
            <p className="text-xs text-white/33">Supports PDFs, Word, Spreadsheets, PowerPoint, Markdown, and Text documents.</p>
          </div>
        )}
      </div>

      {/* Documents Grid / Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-600 text-white/80">Meeting Repository</h4>
            {documents.length > 0 && (
              <span className="text-xs text-white/40">
                {selectedDocIds.length} of {documents.length} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {documents.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="px-2.5 py-1 rounded-lg text-xs font-500 text-indigo-300/90 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckSquare size={13} className={isAllSelected ? "text-indigo-400" : "text-white/40"} />
                {isAllSelected ? "Deselect All" : "Select All"}
              </button>
            )}
            <button
              onClick={loadDocuments}
              className="px-2.5 py-1 rounded-lg text-xs font-500 text-white/40 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] p-12 text-center text-white/35 text-sm" style={{ background: "rgba(255,255,255,0.01)" }}>
            <Database size={24} className="mx-auto text-white/10 mb-2" />
            No documents uploaded in this meeting context.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc) => {
              const fileType = getFileTypeDetails(doc.fileType);
              const isSelected = selectedDocIds.includes(doc._id);
              return (
                <div
                  key={doc._id}
                  onClick={() => toggleSelectDoc(doc._id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group relative",
                    isSelected
                      ? "border-indigo-500/50 bg-indigo-500/[0.06] shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                      : "border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.12] opacity-75"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkbox indicator */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all",
                        isSelected
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-500/30"
                          : "border-white/20 bg-white/[0.03] text-transparent group-hover:border-white/40"
                      )}
                    >
                      <Check size={12} className={cn("stroke-[3]", !isSelected && "opacity-0")} />
                    </div>

                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border", fileType.bg)}>
                      <fileType.icon size={18} className={fileType.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-600 text-white truncate" title={doc.fileName}>{doc.fileName}</p>
                      </div>
                      <p className="text-xs text-white/40 mt-1 uppercase">
                        {formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        previewDocument(doc);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06] transition-all"
                      title="Preview Document"
                    >
                      <Eye size={14} />
                    </button>
                    <a
                      href={doc.storageUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06] transition-all"
                      title="Download File"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ask About This Document - Reusable AI Assistant Component */}
      <DocumentChat documentNames={selectedDocs.map((d) => d.fileName)} />

      {/* Floating Document Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1021] border border-white/[0.08] rounded-2xl w-full max-w-5xl h-[85vh] overflow-hidden animate-fade-in flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-black/20">
              <h3 className="font-600 text-white text-sm truncate max-w-md">{previewName || "Document Preview"}</h3>
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setPreviewName(null);
                }}
                className="text-white/45 hover:text-white p-1 rounded-lg hover:bg-white/[0.05]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 bg-[#111] relative">
              <iframe src={previewUrl} className="w-full h-full border-none" title="Document Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
