"use client";

import { useState, useEffect } from "react";
import { Plus, X, Clock, User as UserIcon, List, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AddAgendaModalProps {
  meetingId: string;
  onAdded?: () => void;
}

export default function AddAgendaModal({ meetingId, onAdded }: AddAgendaModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("15");
  const [presenter, setPresenter] = useState("");

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleOpen = () => {
    setTitle("");
    setDescription("");
    setDuration("15");
    setPresenter("");
    setError("");
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!loading) setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Topic title is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/meetings/${meetingId}/agenda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          estimatedDuration: parseInt(duration) || 15,
          presenterId: presenter.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add agenda item");
      }

      setIsOpen(false);
      if (onAdded) onAdded();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to add agenda item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-600 flex items-center gap-1.5 transition-all shadow-sm"
      >
        <Plus size={14} />
        Add Agenda Item
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0 animate-fade-in">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <List size={16} />
                </div>
                <div>
                  <h3 className="text-base font-700 text-white">Add Agenda Item</h3>
                  <p className="text-xs text-white/40">Add a new discussion topic to this meeting</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-500 text-white/70 mb-1.5">
                  Topic Title <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Financial Q3 Review & Budget Approval"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-white/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-500 text-white/70 mb-1.5">
                  Description <span className="text-white/30">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief context or key objectives for this agenda item..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-white/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-500 text-white/70 mb-1.5 flex items-center gap-1">
                    <Clock size={12} className="text-amber-400" />
                    Estimated Mins
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-500 text-white/70 mb-1.5 flex items-center gap-1">
                    <UserIcon size={12} className="text-indigo-400" />
                    Presenter <span className="text-white/30">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={presenter}
                    onChange={(e) => setPresenter(e.target.value)}
                    placeholder="e.g. John Doe / CFO"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-white/20"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-500 text-white/60 hover:text-white hover:bg-white/[0.05] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gradient px-5 py-2 rounded-xl text-xs font-600 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      Add Topic
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
