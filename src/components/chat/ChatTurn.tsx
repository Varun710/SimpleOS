import type { ChatMessage as ChatMessageType } from "@/stores/chat-store";
import { ChatMessage } from "./ChatMessage";
import { Loader2 } from "lucide-react";

interface ChatTurnProps {
  userMessage: ChatMessageType;
  assistantMessage?: ChatMessageType;
  isLoading?: boolean;
}

export function ChatTurn({ userMessage, assistantMessage, isLoading }: ChatTurnProps) {
  return (
    <div className="mb-8 group/turn border-b border-border/30 pb-6 last:border-b-0 last:pb-0">
      {/* User Message */}
      <div className="mb-4">
        <ChatMessage message={userMessage} />
      </div>
      
      {/* Assistant Response */}
      {assistantMessage ? (
        <div className="mb-0">
          <ChatMessage message={assistantMessage} />
        </div>
      ) : isLoading ? (
        <div className="flex justify-start mb-0">
          <div className="bg-muted rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

