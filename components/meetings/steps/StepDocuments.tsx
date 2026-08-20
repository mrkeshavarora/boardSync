"use client";

import { UploadCloud, File, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { isAllowedDocument } from "@/lib/documentValidation";

type UploadStatus = "uploading" | "done" | "error";

export type DocumentDraft = {
  id: string;
  name: string;
  size: string;
  type: string;
  fileSizeBytes: number;
  storageUrl?: string;
  storageKey?: string;
  status: UploadStatus;
  error?: string;
  progress: number;
};

async function uploadToCloudinary(
  file: File,
  onProgress: (pct: number) => void
): Promise<{ url: string; key: string }> {
  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: "meeting_documents" }),
  });
  if (!signRes.ok) throw new Error("Failed to get upload signature");
  const { timestamp, signature, folder, api_key, cloud_name } = await signRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("api_key", api_key);
  formData.append("folder", folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({ url: data.secure_url, key: data.public_id });
      } else {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function StepDocuments({
  data,
  updateData,
}: {
  data: any;
  updateData: (d: any) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local ref so async upload closures always see latest docs
  const docsRef = useRef<DocumentDraft[]>(data.documents ?? []);
  const syncDocs = (next: DocumentDraft[]) => {
    docsRef.current = next;
    updateData({ documents: next });
  };

  const patchDoc = (id: string, patch: Partial<DocumentDraft>) => {
    syncDocs(docsRef.current.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => isAllowedDocument(file.name, file.type));

    if (validFiles.length < fileArray.length) {
      alert("Some files were skipped. Only document files (PDF, Word, Excel, PowerPoint, Text, Markdown) are allowed. Images and videos are blocked.");
    }

    if (validFiles.length === 0) return;

    const newDrafts: DocumentDraft[] = validFiles.map((file) => ({
      id: Math.random().toString(36).slice(2),
      name: file.name,
      size: formatSize(file.size),
      fileSizeBytes: file.size,
      type: (file.name.split(".").pop() ?? "file").toUpperCase(),
      status: "uploading",
      progress: 0,
    }));

    syncDocs([...docsRef.current, ...newDrafts]);

    // Upload concurrently
    await Promise.all(
      validFiles.map((file, i) => {
        const draft = newDrafts[i];
        return uploadToCloudinary(file, (pct) => {
          patchDoc(draft.id, { progress: pct });
        })
          .then(({ url, key }) => {
            patchDoc(draft.id, { status: "done", storageUrl: url, storageKey: key, progress: 100 });
          })
          .catch((err: any) => {
            patchDoc(draft.id, { status: "error", error: err.message ?? "Upload failed" });
          });
      })
    );
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleRemove = (id: string) => {
    syncDocs(docsRef.current.filter((d) => d.id !== id));
  };

  const docs: DocumentDraft[] = data.documents ?? [];
  const doneCount = docs.filter((d) => d.status === "done").length;
  const uploadingCount = docs.filter((d) => d.status === "uploading").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-600 text-white">Documents</h2>
        <p className="text-sm text-white/40">
          Attach files relevant to this meeting. They will be visible in Meeting Details for all participants.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer select-none ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-white/[0.1] hover:border-indigo-500/40 hover:bg-white/[0.02]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
          <UploadCloud size={26} className="text-indigo-400" />
        </div>
        <p className="text-sm font-600 text-white mb-1">
          {isDragging ? "Drop files here" : "Drag & drop, or click to browse"}
        </p>
        <p className="text-xs text-white/35">PDF, Word, Excel, PowerPoint, Text, Markdown · up to 50 MB each</p>
      </div>

      {/* Uploading indicator */}
      {uploadingCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-indigo-400 px-1">
          <Loader2 size={13} className="animate-spin" />
          Uploading {uploadingCount} file{uploadingCount > 1 ? "s" : ""}…
        </div>
      )}

      {/* Document list */}
      {docs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-600 text-white/40 uppercase tracking-wider px-1">
            {doneCount} of {docs.length} uploaded
          </p>
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
            >
              {/* Type badge */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-700 ${
                  doc.status === "done"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : doc.status === "error"
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                }`}
              >
                {doc.type.length <= 4 ? doc.type : <File size={16} />}
              </div>

              {/* Info + progress */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-500 text-white truncate">{doc.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/35 shrink-0">{doc.size}</span>
                  {doc.status === "uploading" && (
                    <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${doc.progress}%` }}
                      />
                    </div>
                  )}
                  {doc.status === "done" && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Uploaded
                    </span>
                  )}
                  {doc.status === "error" && (
                    <span className="text-xs text-red-400 flex items-center gap-1 truncate">
                      <AlertCircle size={11} /> {doc.error ?? "Failed"}
                    </span>
                  )}
                </div>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(doc.id); }}
                disabled={doc.status === "uploading"}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
