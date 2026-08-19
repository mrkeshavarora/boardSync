import { useState } from "react";
import { Gavel, Plus, FileText, CheckCircle2, Clock } from "lucide-react";

export default function TabResolutions({ meetingId }: { meetingId: string }) {
  // Mock resolutions
  const [resolutions] = useState([
    {
      id: "1",
      title: "Approval of Annual Financial Report",
      description: "The board approves the financial performance report as presented by the CFO.",
      status: "Passed",
      votes: { for: 10, against: 0, abstain: 0 },
      date: "Aug 15, 2026",
    },
    {
      id: "2",
      title: "Appointment of New Auditor",
      description: "Appoint KPMG as the external auditor for the fiscal year 2027.",
      status: "Pending",
      votes: null,
      date: "Aug 15, 2026",
    }
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-600 text-white">Resolutions Tracker</h2>
          <p className="text-sm text-white/50">Manage formal decisions and voting records.</p>
        </div>
        <button className="btn-gradient px-4 py-2 rounded-lg text-sm font-600 flex items-center gap-2">
          <Plus size={16} /> New Resolution
        </button>
      </div>

      <div className="space-y-4">
        {resolutions.map((res) => (
          <div key={res.id} className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                  <Gavel size={20} />
                </div>
                <div>
                  <h3 className="text-base font-600 text-white">{res.title}</h3>
                  <p className="text-sm text-white/60 mt-1 max-w-2xl">{res.description}</p>
                </div>
              </div>
              <span className={`badge ${
                res.status === 'Passed' 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}>
                {res.status === 'Passed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {res.status}
              </span>
            </div>
            
            {res.status === "Passed" && res.votes && (
              <div className="flex items-center gap-6 pt-4 border-t border-white/[0.06] text-sm text-white/50">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> For: {res.votes.for}</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Against: {res.votes.against}</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-500"></span> Abstain: {res.votes.abstain}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
