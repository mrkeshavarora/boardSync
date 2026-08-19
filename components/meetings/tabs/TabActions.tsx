import { useState } from "react";
import { CheckSquare, Plus, Clock, User, Calendar } from "lucide-react";

export default function TabActions({ meetingId }: { meetingId: string }) {
  // Mock action items
  const [actions] = useState([
    {
      id: "1",
      title: "Draft Q4 Budget Proposal",
      assignee: "Robert Davis",
      dueDate: "Sep 01, 2026",
      status: "In Progress",
    },
    {
      id: "2",
      title: "Distribute finalized report to shareholders",
      assignee: "Sarah Kim",
      dueDate: "Aug 20, 2026",
      status: "Pending",
    },
    {
      id: "3",
      title: "Confirm dates for next board retreat",
      assignee: "Alexandra Chen",
      dueDate: "Aug 25, 2026",
      status: "Completed",
    }
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-600 text-white">Action Items</h2>
          <p className="text-sm text-white/50">Track tasks assigned during the meeting.</p>
        </div>
        <button className="btn-gradient px-4 py-2 rounded-lg text-sm font-600 flex items-center gap-2">
          <Plus size={16} /> New Task
        </button>
      </div>

      <div className="space-y-3">
        {actions.map((action) => (
          <div key={action.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                action.status === "Completed" 
                  ? "bg-indigo-500 border-indigo-500 text-white" 
                  : "border-white/20 text-transparent hover:border-white/40"
              }`}>
                <CheckSquare size={14} />
              </button>
              <div>
                <h3 className={`text-sm font-600 ${action.status === 'Completed' ? 'text-white/40 line-through' : 'text-white'}`}>
                  {action.title}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-xs text-white/50">
                  <span className="flex items-center gap-1"><User size={12} /> {action.assignee}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {action.dueDate}</span>
                </div>
              </div>
            </div>
            
            <span className={`badge text-xs ${
              action.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              action.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
              'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {action.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
