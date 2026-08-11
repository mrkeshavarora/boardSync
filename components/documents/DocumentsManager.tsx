"use client";

import React, { useEffect, useState } from "react";
import { FileText, Download, Upload, Eye } from "lucide-react";

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

export default function DocumentsManager() {
  const [meetingId, setMeetingId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [s3Configured, setS3Configured] = useState<boolean | null>(null);

  useEffect(() => {
    // check Cloudinary config
    fetch('/api/cloudinary/config').then((r) => r.json()).then((j) => setS3Configured(!!j?.configured)).catch(() => setS3Configured(false));
  }, []);

  async function presignAndUpload() {
    if (!file) return alert("Select a file first");
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

      // save metadata in our DB
      const endpoint = meetingId ? `/api/meetings/${meetingId}/documents` : `/api/documents`;
      const payload: any = { fileName: file.name, fileType: file.type, fileSize: file.size, storageKey: uploadData.public_id, storageUrl: uploadData.secure_url };
      
      const metaRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!metaRes.ok) {
        const txt = await metaRes.text();
        console.warn('metadata save failed', txt);
      }

      alert("Upload successful");
      setFile(null);
      await loadDocuments();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadDocuments() {
    try {
      const endpoint = meetingId ? `/api/meetings/${meetingId}/documents` : `/api/documents`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to load documents");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
      alert("Could not load documents");
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [meetingId]);

  function previewDocument(doc: IDocument) {
    // For PDFs, open inline in new tab/frame; for others, open in new tab to download or preview
    if (doc.fileType === 'application/pdf') {
      setPreviewUrl(doc.storageUrl);
    } else {
      window.open(doc.storageUrl, '_blank');
    }
  }

  return (
    <div className="space-y-6">
      {s3Configured === false && (
        <div className="p-3 rounded bg-red-600/10 text-red-300">Cloudinary is not configured on the server. Uploads will fail until Cloudinary credentials are set in the server environment.</div>
      )}

      <div className="flex items-center gap-3">
        <input value={meetingId} onChange={(e) => setMeetingId(e.target.value)} placeholder="Meeting ID (required to save metadata)" className="px-3 py-2 rounded bg-white/5 w-80" />
        <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
        <button onClick={presignAndUpload} className="px-3 py-2 bg-indigo-600 text-white rounded" disabled={loading}>
          <Upload size={16} /> Upload
        </button>
        <button onClick={loadDocuments} className="px-3 py-2 bg-white/[0.04] text-white rounded">
          <FileText size={16} /> Load
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Documents</h3>
        <div className="mt-3 space-y-2">
          {documents.length === 0 && <div className="text-sm text-white/50">No documents loaded for this meeting.</div>}
          {documents.map((d) => (
            <div key={d._id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded">
              <div className="flex items-center gap-3">
                <FileText />
                <div>
                  <div className="font-medium">{d.fileName}</div>
                  <div className="text-xs text-white/50">{d.fileType} • {(d.fileSize/1024).toFixed(1)} KB</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => previewDocument(d)} className="px-2 py-1 bg-white/[0.03] rounded"> <Eye size={14}/> Preview</button>
                <a href={d.storageUrl} target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/[0.03] rounded"> <Download size={14}/> Download</a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {previewUrl && (
        <div>
          <h4 className="text-md font-semibold">Preview</h4>
          <div className="mt-2 border rounded overflow-hidden" style={{height: '600px'}}>
            <iframe src={previewUrl} className="w-full h-full" title="Document Preview" />
          </div>
          <div className="mt-2">
            <button onClick={() => setPreviewUrl(null)} className="px-3 py-2 bg-white/[0.04] rounded">Close Preview</button>
          </div>
        </div>
      )}
    </div>
  );
}
