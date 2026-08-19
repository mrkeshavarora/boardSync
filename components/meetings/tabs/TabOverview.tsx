"use client";

import { Calendar, Clock, MapPin, Video, Users, FileText } from "lucide-react";

export default function TabOverview() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Left Column: Main Details */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h3 className="text-lg font-600 text-white mb-4">Meeting Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 text-indigo-400">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-xs font-500 text-white/40 uppercase tracking-wider mb-1">Date</p>
                <p className="text-sm font-600 text-white">August 15, 2026</p>
              </div>
            </div>
            
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-400">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-xs font-500 text-white/40 uppercase tracking-wider mb-1">Time</p>
                <p className="text-sm font-600 text-white">10:00 AM - 12:00 PM UTC</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-4 sm:col-span-2">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-400">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-xs font-500 text-white/40 uppercase tracking-wider mb-1">Location</p>
                <p className="text-sm font-600 text-white">Boardroom A, 1st Floor HQ</p>
              </div>
            </div>
            
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-4 sm:col-span-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-400">
                <Video size={18} />
              </div>
              <div>
                <p className="text-xs font-500 text-white/40 uppercase tracking-wider mb-1">Online Link</p>
                <a href="#" className="text-sm font-600 text-blue-400 hover:text-blue-300 transition-colors">
                  https://zoom.us/j/1234567890
                </a>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-600 text-white mb-4">Description</h3>
          <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <p className="text-sm text-white/70 leading-relaxed">
              Quarterly review of company strategy, financial performance, and key operational metrics. 
              Please review the attached Financial Report prior to the meeting.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Quick Stats */}
      <div className="space-y-4">
        <h3 className="text-lg font-600 text-white mb-4">Summary</h3>
        
        <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-white/40" />
            <span className="text-sm font-500 text-white">Participants</span>
          </div>
          <span className="text-sm font-600 text-white">12 Invited</span>
        </div>

        <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-500 text-white">Accepted</span>
          </div>
          <span className="text-sm font-600 text-white">8</span>
        </div>

        <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm font-500 text-white">Pending</span>
          </div>
          <span className="text-sm font-600 text-white">4</span>
        </div>

        <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between mt-6">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-white/40" />
            <span className="text-sm font-500 text-white">Documents</span>
          </div>
          <span className="text-sm font-600 text-white">3 Attached</span>
        </div>
      </div>
    </div>
  );
}
