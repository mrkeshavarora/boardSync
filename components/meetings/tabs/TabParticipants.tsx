"use client";

import { Mail, Shield, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { getInitials } from "@/lib/utils";

export default function TabParticipants() {
  const participants = [
    { id: 1, name: "Alexandra Chen", email: "a.chen@board.com", role: "Chairperson", status: "Accepted" },
    { id: 2, name: "James Miller", email: "j.miller@board.com", role: "Director", status: "Accepted" },
    { id: 3, name: "Sarah Kim", email: "s.kim@board.com", role: "Secretary", status: "Accepted" },
    { id: 4, name: "Robert Davis", email: "r.davis@board.com", role: "CFO", status: "Pending" },
    { id: 5, name: "Emma Wilson", email: "e.wilson@board.com", role: "COO", status: "Tentative" },
    { id: 6, name: "Michael Lee", email: "m.lee@board.com", role: "Consultant", status: "Declined" },
  ];

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "Accepted":
        return <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20"><CheckCircle2 size={12} /> Accepted</span>;
      case "Declined":
        return <span className="badge bg-red-500/10 text-red-400 border-red-500/20"><XCircle size={12} /> Declined</span>;
      case "Tentative":
        return <span className="badge bg-amber-500/10 text-amber-400 border-amber-500/20"><AlertCircle size={12} /> Tentative</span>;
      default:
        return <span className="badge bg-white/[0.05] text-white/50 border-white/[0.1]"><Clock size={12} /> Pending</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-600 text-white">Participants & RSVPs</h3>
        <button className="px-4 py-2 rounded-lg text-sm font-500 text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors flex items-center gap-2">
          <Mail size={15} /> Remind Pending
        </button>
      </div>

      <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "var(--bg-card)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-600 text-white/40 uppercase tracking-wider">Member</th>
                <th className="px-6 py-4 text-xs font-600 text-white/40 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-600 text-white/40 uppercase tracking-wider">RSVP Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-600 text-indigo-300">
                        {getInitials(p.name)}
                      </div>
                      <div>
                        <p className="text-sm font-600 text-white">{p.name}</p>
                        <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                          <Mail size={10} /> {p.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white/70 flex items-center gap-1.5">
                      {p.role.includes("Chair") || p.role.includes("Secretary") ? <Shield size={14} className="text-indigo-400" /> : null}
                      {p.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusDisplay(p.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
