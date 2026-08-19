"use client";

import { Clock, Download, FileText } from "lucide-react";

export default function TabAgenda() {
  const agendaItems = [
    { id: 1, title: "Call to Order & Welcome", presenter: "James Miller", duration: 5, docs: [] },
    { id: 2, title: "Approval of Previous Minutes", presenter: "Sarah Kim", duration: 10, docs: ["Minutes_Previous.pdf"] },
    { id: 3, title: "Financial Performance Review", presenter: "Robert Davis", duration: 45, docs: ["Financials.xlsx", "Summary_Report.pdf"] },
    { id: 4, title: "Operational Highlights", presenter: "Alexandra Chen", duration: 30, docs: [] },
    { id: 5, title: "Any Other Business (AOB)", presenter: "James Miller", duration: 15, docs: [] },
    { id: 6, title: "Meeting Adjournment", presenter: "James Miller", duration: 5, docs: [] },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-600 text-white">Meeting Agenda</h3>
        <span className="text-sm text-white/50 border border-white/[0.1] px-3 py-1.5 rounded-lg bg-white/[0.02]">
          Total Time: 110 mins
        </span>
      </div>

      <div className="relative border-l-2 border-white/[0.06] ml-4 space-y-8 pb-4">
        {agendaItems.map((item, index) => (
          <div key={item.id} className="relative pl-6">
            {/* Timeline node */}
            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[var(--bg-card)] border-2 border-indigo-500 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.04] transition-colors group">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                <div>
                  <h4 className="text-base font-600 text-white mb-1">
                    <span className="text-indigo-400 mr-2">{index + 1}.</span>
                    {item.title}
                  </h4>
                  <p className="text-sm text-white/50">{item.presenter}</p>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md shrink-0">
                  <Clock size={14} />
                  {item.duration} min
                </div>
              </div>

              {item.docs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <p className="text-xs font-500 text-white/40 uppercase tracking-wider mb-2">Attached Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {item.docs.map((doc, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer">
                        <FileText size={14} className="text-blue-400" />
                        {doc}
                        <Download size={13} className="ml-1 text-white/30" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
