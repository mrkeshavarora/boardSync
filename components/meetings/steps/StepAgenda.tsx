"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StepAgenda({ data, updateData }: { data: any, updateData: (d: any) => void }) {
  const [newItem, setNewItem] = useState({ title: "", duration: "", presenter: "" });

  const handleAddItem = () => {
    if (!newItem.title) return;
    
    updateData({
      agenda: [
        ...data.agenda,
        {
          id: Math.random().toString(36).substring(7),
          title: newItem.title,
          duration: parseInt(newItem.duration) || 15,
          presenter: newItem.presenter,
        }
      ]
    });
    setNewItem({ title: "", duration: "", presenter: "" });
  };

  const handleRemoveItem = (id: string) => {
    updateData({
      agenda: data.agenda.filter((item: any) => item.id !== id)
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-600 text-white">Agenda Builder</h2>
        <p className="text-sm text-white/40">Outline the topics to be discussed in the meeting.</p>
      </div>

      <div className="space-y-4">
        {/* Add new item */}
        <div className="grid grid-cols-12 gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="col-span-12 md:col-span-6">
            <input
              type="text"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              placeholder="Topic title..."
              className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white focus:outline-none focus:border-indigo-500/60 transition-all"
            />
          </div>
          <div className="col-span-6 md:col-span-3">
            <input
              type="text"
              value={newItem.presenter}
              onChange={(e) => setNewItem({ ...newItem, presenter: e.target.value })}
              placeholder="Presenter (optional)"
              className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white focus:outline-none focus:border-indigo-500/60 transition-all"
            />
          </div>
          <div className="col-span-4 md:col-span-2">
            <div className="relative">
              <Clock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="number"
                value={newItem.duration}
                onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })}
                placeholder="Mins"
                className="w-full pl-8 pr-2 py-2 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white focus:outline-none focus:border-indigo-500/60 transition-all"
              />
            </div>
          </div>
          <div className="col-span-2 md:col-span-1 flex justify-end">
            <button
              onClick={handleAddItem}
              disabled={!newItem.title}
              className="w-full h-full rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center disabled:opacity-50 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Agenda List */}
        <div className="space-y-2">
          {data.agenda.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-white/[0.1] rounded-xl">
              <p className="text-sm text-white/30">No agenda items added yet.</p>
            </div>
          ) : (
            data.agenda.map((item: any, index: number) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] group">
                <button className="text-white/20 hover:text-white/50 cursor-grab">
                  <GripVertical size={16} />
                </button>
                <div className="w-6 h-6 rounded-md bg-white/[0.05] flex items-center justify-center text-xs font-500 text-white/50">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-500 text-white">{item.title}</p>
                  <p className="text-xs text-white/40">
                    {item.duration} min {item.presenter ? `· ${item.presenter}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
