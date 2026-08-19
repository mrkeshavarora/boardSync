"use client";

import { FileText, Download, Eye, UploadCloud, MoreVertical } from "lucide-react";

export default function TabDocuments() {
  const documents = [
    { id: 1, name: "Financials.xlsx", size: "1.2 MB", type: "Excel", uploadedBy: "Robert Davis", date: "Aug 10, 2026" },
    { id: 2, name: "Summary_Report.pdf", size: "3.4 MB", type: "PDF", uploadedBy: "Robert Davis", date: "Aug 10, 2026" },
    { id: 3, name: "Minutes_Board_Meeting.pdf", size: "845 KB", type: "PDF", uploadedBy: "Sarah Kim", date: "Aug 12, 2026" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-600 text-white">Meeting Documents</h3>
        <button className="btn-gradient px-4 py-2 rounded-lg text-sm font-600 flex items-center gap-2">
          <UploadCloud size={15} /> Upload Document
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div key={doc.id} className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors group relative">
            <button className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
              <MoreVertical size={16} />
            </button>
            
            <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mb-4">
              <FileText size={24} className={doc.type === "PDF" ? "text-red-400" : "text-emerald-400"} />
            </div>
            
            <h4 className="text-sm font-600 text-white truncate pr-6 mb-1" title={doc.name}>
              {doc.name}
            </h4>
            <p className="text-xs text-white/40 mb-4">{doc.size} • {doc.type}</p>
            
            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
              <div className="text-[10px] text-white/30">
                Uploaded by {doc.uploadedBy}<br/>on {doc.date}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] text-white transition-colors" title="Preview">
                  <Eye size={14} />
                </button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 transition-colors" title="Download">
                  <Download size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
