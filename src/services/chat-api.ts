// In development, Vite proxy will forward /api requests to the Express server
// In production, set VITE_API_URL to your production API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function sendMessage(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        systemPrompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || "Failed to send message");
    }

    const data = await response.json();
    return data.message || "";
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        "Network error: Could not connect to the chat server. Make sure the server is running."
      );
    }
    throw error;
  }
}

