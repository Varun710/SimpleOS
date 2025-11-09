// Terminal API service for WebSocket and REST communication
const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 
  (API_BASE_URL ? API_BASE_URL.replace(/^http/, "ws") : "ws://localhost:3001");

export interface CommandResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface WebSocketMessage {
  type: "output" | "error" | "exit" | "prompt";
  data: string;
}

export class TerminalService {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private onMessage: ((message: WebSocketMessage) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  connect(onMessage: (message: WebSocketMessage) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.onMessage = onMessage;
      const wsUrl = `${WS_BASE_URL}/api/terminal/session/${this.sessionId}`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            if (this.onMessage) {
              this.onMessage(message);
            }
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          // Attempt to reconnect if not intentionally closed
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              this.connect(onMessage).catch(console.error);
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn("WebSocket is not connected");
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onMessage = null;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export async function executeCommand(
  command: string,
  cwd: string
): Promise<CommandResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/terminal/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command,
        cwd,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || "Failed to execute command");
    }

    const data = await response.json();
    return {
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      exitCode: data.exitCode || 0,
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        "Network error: Could not connect to the terminal server. Make sure the server is running."
      );
    }
    throw error;
  }
}

