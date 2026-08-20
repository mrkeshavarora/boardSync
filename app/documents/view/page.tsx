"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FileText, ArrowLeft, Download, Loader2, FileCode, FileSpreadsheet } from "lucide-react";

function DocumentViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url");
  const name = searchParams.get("name") || "Document Viewer";
  const type = searchParams.get("type") || "";

  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ext = name.split(".").pop()?.toLowerCase() || "";
  const isOfficeDoc = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);
  const isTextLike = ["txt", "md", "csv", "json"].includes(ext) || type.startsWith("text/");

  useEffect(() => {
    if (isTextLike && url) {
      setLoading(true);
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch document content");
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError("Unable to render this text document. Please download to view.");
          setLoading(false);
        });
    }
  }, [url, isTextLike]);

  if (!url) {
    return (
      <div className="min-h-screen bg-[#060a16] text-white flex flex-col items-center justify-center p-6">
        <p className="text-sm text-white/50">No document URL provided.</p>
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              window.close();
            }
          }}
          className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  return (
    <div className="min-h-screen bg-[#060a16] text-white flex flex-col">
      {/* Top Bar */}
      <header className="px-6 py-4 bg-[#0a0f1d] border-b border-white/[0.08] flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.close();
              }
            }}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors"
            title="Close Tab"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-600 text-white truncate max-w-lg flex items-center gap-2">
              <FileText size={16} className="text-indigo-400 shrink-0" />
              {name}
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
              {ext || "Document"} Viewer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={url}
            download={name}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-600 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Download size={14} />
            <span>Download</span>
          </a>
        </div>
      </header>

      {/* Main Preview Container */}
      <main className="flex-1 bg-[#03060f] relative overflow-hidden flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-white/50">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
            <p className="text-xs">Loading document contents...</p>
          </div>
        )}

        {error && (
          <div className="text-center p-6 space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <a
              href={url}
              className="inline-block px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-xs font-semibold"
            >
              Download Instead
            </a>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* PDF View */}
            {ext === "pdf" && (
              <iframe
                src={`${url}#toolbar=1`}
                className="w-full h-full border-none bg-[#1e1e1e]"
                title={name}
              />
            )}

            {/* Office View (Word, Excel, PowerPoint) */}
            {isOfficeDoc && (
              <iframe
                src={officeViewerUrl}
                className="w-full h-full border-none bg-white"
                title={name}
              />
            )}

            {/* Text / Markdown / CSV Custom Render */}
            {isTextLike && textContent !== null && (
              <div className="w-full h-full max-w-5xl overflow-auto p-8 custom-scrollbar">
                <div className="bg-[#0a0f1d] border border-white/[0.08] rounded-xl p-6 shadow-inner min-h-full">
                  <pre className="text-xs font-mono text-white/80 leading-relaxed whitespace-pre-wrap font-medium select-text">
                    {textContent}
                  </pre>
                </div>
              </div>
            )}

            {/* General Fallback (e.g. unknown types) */}
            {!isOfficeDoc && ext !== "pdf" && !isTextLike && (
              <div className="text-center space-y-4 max-w-md p-6">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-white/40">
                  <FileText size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-600 text-white">Preview unavailable</h3>
                  <p className="text-xs text-white/40">
                    This file format cannot be rendered directly in the browser. You can download and view it locally.
                  </p>
                </div>
                <a
                  href={url}
                  download={name}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Download size={14} />
                  <span>Download File</span>
                </a>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function DocumentViewerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#060a16] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
        <p className="text-xs text-white/50">Initializing viewer...</p>
      </div>
    }>
      <DocumentViewerContent />
    </Suspense>
  );
}
