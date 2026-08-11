import Link from "next/link";
import { BookOpen, ExternalLink, Clock, FileText } from "lucide-react";

export default function TabMinutes({ meetingId }: { meetingId: string }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-600 text-white">Meeting Minutes</h2>
          <p className="text-sm text-white/50">Draft and review the official minutes for this meeting.</p>
        </div>
        <Link 
          href={`/meetings/${meetingId}/minutes`}
          className="btn-gradient px-4 py-2 rounded-lg text-sm font-600 flex items-center gap-2"
        >
          <BookOpen size={16} /> Open Editor <ExternalLink size={14} />
        </Link>
      </div>

      <div className="p-12 border border-white/[0.06] border-dashed rounded-xl flex flex-col items-center justify-center text-center bg-white/[0.02]">
        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400">
          <FileText size={24} />
        </div>
        <h3 className="text-lg font-600 text-white mb-2">Minutes are in Draft</h3>
        <p className="text-sm text-white/50 max-w-md">
          The minutes for this meeting have been drafted but are waiting for review. 
          Open the full-screen editor to make changes or approve them.
        </p>
      </div>
    </div>
  );
}
