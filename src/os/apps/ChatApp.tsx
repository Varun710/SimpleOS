import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/stores/chat-store";
import type { ChatMessage as ChatMessageType } from "@/stores/chat-store";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatTurn } from "@/components/chat/ChatTurn";
import { ChatInput } from "@/components/chat/ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { sendMessage } from "@/services/chat-api";

const SYSTEM_PROMPT = "You are a helpful assistant inside a Mac-style browser OS. Be concise and helpful.";

export function ChatApp() {
  const {
    chats,
    currentChatId,
    messages,
    isLoading,
    error,
    createChat,
    addMessage,
    setLoading,
    setError,
    loadChats,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);


  // Scroll to bottom function
  const scrollToBottom = useCallback((smooth = true) => {
    // Find the ScrollArea viewport element
    const scrollArea = scrollViewportRef.current?.closest('[data-slot="scroll-area"]');
    const viewport = scrollArea?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
    
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    } else if (messagesEndRef.current) {
      // Fallback to scrollIntoView
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      scrollToBottom(true);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, currentChatId, isLoading, scrollToBottom]);

  // Create initial chat if none exists
  useEffect(() => {
    if (chats.length === 0 && !currentChatId) {
      createChat();
    }
  }, [chats.length, currentChatId, createChat]);

  const handleSendMessage = async (content: string) => {
    if (!currentChatId) {
      const newChatId = createChat();
      // Wait a bit for the chat to be created
      setTimeout(() => handleSendMessageToChat(newChatId, content), 100);
      return;
    }

    await handleSendMessageToChat(currentChatId, content);
  };

  const handleSendMessageToChat = async (chatId: string, content: string) => {
    // Add user message immediately
    addMessage(chatId, {
      role: "user",
      content,
    });

    setLoading(true);
    setError(null);

    try {
      // Get all messages for context (including the one we just added)
      // Read directly from store to get latest state
      const storeState = useChatStore.getState();
      const chatMessages = storeState.messages[chatId] || [];
      const apiMessages = chatMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add system prompt at the beginning
      const messagesWithSystem = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...apiMessages,
      ];

      // Call API
      const response = await sendMessage(messagesWithSystem);

      // Add assistant response
      addMessage(chatId, {
        role: "assistant",
        content: response,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      
      // Don't add error as a message - just show the alert
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentMessages = currentChatId ? messages[currentChatId] || [] : [];

  // Group messages into turns (user message + assistant response pairs)
  const turns: Array<{
    userMessage: ChatMessageType;
    assistantMessage?: ChatMessageType;
    turnIndex: number;
  }> = [];

  for (let i = 0; i < currentMessages.length; i++) {
    const message = currentMessages[i];
    if (message.role === "user") {
      // Find the next assistant message if it exists
      const assistantMessage = currentMessages[i + 1]?.role === "assistant" 
        ? currentMessages[i + 1] 
        : undefined;
      
      turns.push({
        userMessage: message,
        assistantMessage,
        turnIndex: turns.length,
      });
    }
  }

  // Handle case where last message is user message (waiting for response)
  const lastMessage = currentMessages[currentMessages.length - 1];
  const isWaitingForResponse = lastMessage?.role === "user" && isLoading;

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      <ChatHeader />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <ChatSidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-hidden min-h-0">
            <ScrollArea className="h-full">
              <div ref={scrollViewportRef} className="p-6 max-w-4xl mx-auto">
                {turns.length === 0 && !isWaitingForResponse && (
                  <div className="flex items-center justify-center min-h-[400px] text-center text-muted-foreground">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Start a conversation
                      </h3>
                      <p>Send a message to begin chatting with the assistant.</p>
                    </div>
                  </div>
                )}
                {turns.map((turn, index) => (
                  <ChatTurn
                    key={turn.userMessage.id}
                    userMessage={turn.userMessage}
                    assistantMessage={turn.assistantMessage}
                    isLoading={index === turns.length - 1 && isWaitingForResponse}
                  />
                ))}
                {/* Handle case where we're waiting for the first response */}
                {isWaitingForResponse && turns.length === 0 && lastMessage && (
                  <ChatTurn
                    userMessage={lastMessage}
                    isLoading={true}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>
          {error && (
            <div className="px-6 pt-2 shrink-0">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
          <div className="shrink-0">
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isLoading}
              disabled={!currentChatId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

