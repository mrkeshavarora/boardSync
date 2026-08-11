"use client";

import { Calendar, Clock, MapPin, Link2, Users, FileText, List } from "lucide-react";
import { getInitials } from "@/lib/utils";

export default function StepReview({ data }: { data: any }) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-lg font-600 text-white">Review Meeting</h2>
        <p className="text-sm text-white/40">Confirm all details before creating the meeting.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="mb-6">
              <span className="badge bg-indigo-500/20 text-indigo-400 border-indigo-500/30 mb-3">
                {data.meetingType || "Not Specified"}
              </span>
              <h3 className="text-2xl font-700 text-white">{data.title || "Untitled Meeting"}</h3>
              {data.description && (
                <p className="text-sm text-white/60 mt-2">{data.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <Calendar size={15} className="text-white/50" />
                </div>
                <div>
                  <p className="text-xs font-500 text-white/40 uppercase tracking-wider mb-0.5">Date</p>
                  <p className="text-sm font-500 text-white">{data.date || "Not set"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <Clock size={15} className="text-white/50" />
                </div>
                <div>
                  <p className="text-xs font-500 text-white/40 uppercase tracking-wider mb-0.5">Time</p>
                  <p className="text-sm font-500 text-white">
                    {data.startTime || "--:--"} - {data.endTime || "--:--"} {data.timezone}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:col-span-2">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <MapPin size={15} className="text-white/50" />
                </div>
                <div>
                  <p className="text-xs font-500 text-white/40 uppercase tracking-wider mb-0.5">Location</p>
                  <p className="text-sm font-500 text-white">{data.location || "TBD"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:col-span-2">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <Link2 size={15} className="text-white/50" />
                </div>
                <div>
                  <p className="text-xs font-500 text-white/40 uppercase tracking-wider mb-0.5">Video meeting link</p>
                  {data.onlineMeeting ? (
                    <a href={data.onlineMeeting} target="_blank" rel="noreferrer" className="text-sm font-500 text-indigo-300 hover:text-indigo-200 break-all">
                      {data.onlineMeeting}
                    </a>
                  ) : (
                    <p className="text-sm font-500 text-white/50">No video link specified.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Agenda Preview */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <List size={16} className="text-white/40" />
              <h4 className="text-sm font-600 text-white">Agenda ({data.agenda.length})</h4>
            </div>
            <div className="space-y-2">
              {data.agenda.length > 0 ? (
                data.agenda.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.01]">
                    <div>
                      <p className="text-sm font-500 text-white">{i + 1}. {item.title}</p>
                      {item.presenter && <p className="text-xs text-white/40 mt-0.5">{item.presenter}</p>}
                    </div>
                    <span className="text-xs font-500 text-white/50">{item.duration}m</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/30 italic">No agenda items added.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          {/* Participants */}
          <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-white/40" />
              <h4 className="text-sm font-600 text-white">Participants ({data.participants.length})</h4>
            </div>
            <div className="space-y-3">
              {data.participants.length > 0 ? (
                data.participants.map((p: any) => (
                  <div key={p.userId} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-600 text-white">
                      {getInitials(p.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-500 text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-white/40 truncate">{p.role}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/30 italic">No participants added.</p>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-white/40" />
              <h4 className="text-sm font-600 text-white">Documents ({data.documents.length})</h4>
            </div>
            <div className="space-y-2">
              {data.documents.length > 0 ? (
                data.documents.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                    <FileText size={12} className="text-indigo-400" />
                    <span className="truncate">{d.name}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/30 italic">No documents attached.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
