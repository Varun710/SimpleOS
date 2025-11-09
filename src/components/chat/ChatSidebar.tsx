import { useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Edit2, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ChatSidebar() {
  const {
    chats,
    currentChatId,
    createChat,
    deleteChat,
    renameChat,
    setCurrentChat,
  } = useChatStore();
  
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleNewChat = () => {
    createChat();
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChat(chatId);
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat?")) {
      deleteChat(chatId);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, chat: { id: string; title: string }) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveEdit = (chatId: string) => {
    if (editTitle.trim()) {
      renameChat(chatId, editTitle.trim());
    }
    setEditingChatId(null);
    setEditTitle("");
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditTitle("");
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: new Date(timestamp).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="w-64 border-r border-border bg-muted/30 flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Button onClick={handleNewChat} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chats.map((chat) => {
            const isActive = chat.id === currentChatId;
            const isEditing = editingChatId === chat.id;

            return (
              <div
                key={chat.id}
                className={cn(
                  "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                  isActive ? "bg-primary/10" : "hover:bg-muted"
                )}
                onClick={() => !isEditing && handleSelectChat(chat.id)}
              >
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveEdit(chat.id);
                        } else if (e.key === "Escape") {
                          handleCancelEdit();
                        }
                      }}
                      onBlur={() => handleSaveEdit(chat.id)}
                      autoFocus
                      className="h-8 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {chat.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimestamp(chat.lastModified)}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button
                        onClick={(e) => handleStartEdit(e, chat)}
                        className="p-1 hover:bg-muted rounded"
                        title="Rename chat"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="p-1 hover:bg-destructive/20 rounded"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {chats.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No chats yet. Create a new chat to get started!
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

