import { useChatStore } from "@/stores/chat-store";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

export function ChatHeader() {
  const { chats, currentChatId, renameChat } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const currentChat = currentChatId
    ? chats.find((c) => c.id === currentChatId)
    : null;

  useEffect(() => {
    if (currentChat) {
      setEditTitle(currentChat.title);
    }
  }, [currentChat]);

  const handleSave = () => {
    if (currentChatId && editTitle.trim()) {
      renameChat(currentChatId, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (currentChat) {
      setEditTitle(currentChat.title);
    }
    setIsEditing(false);
  };

  if (!currentChat) {
    return (
      <div className="px-6 py-4 border-b border-border bg-muted/50">
        <h2 className="text-lg font-semibold">Chat</h2>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 border-b border-border bg-muted/50">
      {isEditing ? (
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSave();
            } else if (e.key === "Escape") {
              handleCancel();
            }
          }}
          onBlur={handleSave}
          autoFocus
          className="text-lg font-semibold"
        />
      ) : (
        <h2
          className="text-lg font-semibold cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => setIsEditing(true)}
          title="Click to rename"
        >
          {currentChat.title}
        </h2>
      )}
    </div>
  );
}

