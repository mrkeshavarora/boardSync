"use client";

import { Calendar, Clock, Globe, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type StepDetailsData = {
  title: string;
  description: string;
  meetingType: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location: string;
  onlineMeeting: string;
};

type StepDetailsErrors = Partial<Record<"title" | "date" | "startTime" | "endTime" | "timezone" | "onlineMeeting", string>>;

type StepDetailsProps = {
  data: StepDetailsData;
  updateData: (d: Partial<StepDetailsData>) => void;
  errors?: StepDetailsErrors;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="mt-1.5 text-xs text-red-300">{message}</p>;
}

export default function StepDetails({ data, updateData, errors = {} }: StepDetailsProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-600 text-white">Meeting Details</h2>
        <p className="text-sm text-white/40">Enter the basic information about this meeting.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-600 text-white/60 uppercase tracking-wider mb-1.5 block">Title</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => updateData({ title: e.target.value })}
            placeholder="e.g. Q3 Board of Directors Meeting"
            aria-invalid={!!errors.title}
            className={cn("w-full px-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 transition-all", errors.title && "border-red-500/60")}
          />
          <FieldError message={errors.title} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-600 text-white/60 uppercase tracking-wider mb-1.5 block">Meeting Type</label>
            <select
              value={data.meetingType}
              onChange={(e) => updateData({ meetingType: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg text-sm bg-[#0a0f1e] border border-white/[0.1] text-white focus:outline-none focus:border-indigo-500/60 transition-all"
            >
              <option value="Board Meeting">Board Meeting</option>
              <option value="Committee Meeting">Committee Meeting</option>
              <option value="AGM">Annual General Meeting</option>
              <option value="EGM">Extraordinary General Meeting</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-600 text-white/60 uppercase tracking-wider mb-1.5 block">Date</label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="date"
                value={data.date}
                onChange={(e) => updateData({ date: e.target.value })}
                aria-invalid={!!errors.date}
                className={cn("w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 transition-all", errors.date && "border-red-500/60")}
              />
              <FieldError message={errors.date} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-600 text-white/60 uppercase tracking-wider mb-1.5 block">Start Time</label>
            <div className="relative">
              <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="time"
                value={data.startTime}
                onChange={(e) => updateData({ startTime: e.target.value })}
                aria-invalid={!!errors.startTime}
                className={cn("w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white focus:outline-none focus:border-indigo-500/60 transition-all", errors.startTime && "border-red-500/60")}
              />
              <FieldError message={errors.startTime} />
            </div>
          </div>
          <div>
            <label className="text-xs font-600 text-white/60 uppercase tracking-wider mb-1.5 block">End Time</label>
            <div className="relative">
              <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="time"
                value={data.endTime}
                onChange={(e) => updateData({ endTime: e.target.value })}
                aria-invalid={!!errors.endTime}
                className={cn("w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white focus:outline-none focus:border-indigo-500/60 transition-all", errors.endTime && "border-red-500/60")}
              />
              <FieldError message={errors.endTime} />
            </div>
          </div>
          <div>
            <label className="text-xs font-600 text-white/60 uppercase tracking-wider mb-1.5 block">Timezone</label>
            <div className="relative">
              <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <select
                value={data.timezone}
                onChange={(e) => updateData({ timezone: e.target.value })}
                aria-invalid={!!errors.timezone}
                className={cn("w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-[#0a0f1e] border border-white/[0.1] text-white focus:outline-none focus:border-indigo-500/60 transition-all", errors.timezone && "border-red-500/60")}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Central Europe (CET/CEST)</option>
              </select>
              <FieldError message={errors.timezone} />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-600 text-white/60 uppercase tracking-wider mb-1.5 block">Location (Physical or Virtual)</label>
          <div className="relative">
            <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={data.location}
              onChange={(e) => updateData({ location: e.target.value })}
              placeholder="Boardroom A, 1st Floor"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-600 text-white/60 uppercase tracking-wider mb-1.5 block">Video meeting link</label>
          <div className="relative">
            <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="url"
              value={data.onlineMeeting}
              onChange={(e) => updateData({ onlineMeeting: e.target.value })}
              placeholder="https://zoom.us/j/123456789"
              aria-invalid={!!errors.onlineMeeting}
              className={cn("w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 transition-all", errors.onlineMeeting && "border-red-500/60")}
            />
            <FieldError message={errors.onlineMeeting} />
          </div>
        </div>
        
        <div>
          <label className="text-xs font-600 text-white/60 uppercase tracking-wider mb-1.5 block">Description / Notes</label>
          <textarea
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            placeholder="Optional context for the meeting..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
}
