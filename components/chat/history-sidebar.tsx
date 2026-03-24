"use client";

import { ChatSession } from "@/lib/chat-storage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, MessageSquare } from "lucide-react";

interface HistorySidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (session: ChatSession) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function HistorySidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: HistorySidebarProps) {
  return (
    <aside className="w-52 shrink-0 flex flex-col h-full border-r border-white/10">
      <div className="p-3 border-b border-white/10">
        <Button
          onClick={onNew}
          variant="outline"
          size="sm"
          className="w-full gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <p className="text-xs text-white/40 text-center py-6">
            No conversations yet
          </p>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors hover:bg-white/10",
              activeId === session.id && "bg-white/15"
            )}
            onClick={() => onSelect(session)}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-white/40" />
            <span className="flex-1 truncate text-xs text-white/80">{session.title}</span>
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-white/40 hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
