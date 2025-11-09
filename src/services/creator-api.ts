// In development, Vite proxy will forward /api requests to the Express server
// In production, set VITE_API_URL to your production API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface GeneratedApp {
  name: string;
  html: string;
  css: string;
  js: string;
}

export async function generateApp(prompt: string): Promise<GeneratedApp> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/creator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || "Failed to generate app");
    }

    const data = await response.json();
    return {
      name: data.name || "Generated App",
      html: data.html || "",
      css: data.css || "",
      js: data.js || "",
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        "Network error: Could not connect to the creator server. Make sure the server is running."
      );
    }
    throw error;
  }
}

