import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import { createServer } from "http";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form data

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Invalid request: messages array is required",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OpenAI API key is not configured",
      });
    }

    // Prepare messages for OpenAI API
    const openaiMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Create chat completion
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantMessage = completion.choices[0]?.message?.content;

    if (!assistantMessage) {
      return res.status(500).json({
        error: "No response from OpenAI",
      });
    }

    res.json({
      message: assistantMessage,
    });
  } catch (error) {
    console.error("OpenAI API error:", error);

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return res.status(401).json({
          error: "Invalid API key. Please check your OpenAI API key.",
        });
      }
      if (error.status === 429) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please try again later.",
        });
      }
      if (error.status === 500) {
        return res.status(500).json({
          error: "OpenAI service error. Please try again later.",
        });
      }
    }

    // Generic error
    res.status(500).json({
      error: error.message || "Failed to process chat request",
    });
  }
});

// Browser proxy endpoint - bypasses X-Frame-Options
app.all("/api/proxy", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      // If no url parameter, this might be a direct request - return helpful error
      // This can happen with some asset requests or malformed URLs
      console.warn("Proxy request without url parameter:", req.url);
      return res.status(400).json({
        error: "Invalid request: url query parameter is required",
        hint: "Make sure all URLs are properly formatted with ?url= parameter",
      });
    }

    // Validate URL
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({
        error: "Invalid URL format",
      });
    }

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return res.status(400).json({
        error: "Only http and https protocols are allowed",
      });
    }

    // Handle POST/PUT/DELETE requests (form submissions)
    const method = req.method || "GET";
    const fetchOptions = {
      method,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    };

    // Handle request body for POST/PUT requests
    if (method === "POST" || method === "PUT") {
      if (req.headers["content-type"]) {
        fetchOptions.headers["Content-Type"] = req.headers["content-type"];
      }
      // Express already parsed the body, but we need to handle it properly
      if (req.body) {
        if (typeof req.body === "string") {
          fetchOptions.body = req.body;
        } else {
          // If it's form data or JSON, convert to string
          const contentType = req.headers["content-type"] || "";
          if (contentType.includes("application/json")) {
            fetchOptions.body = JSON.stringify(req.body);
          } else {
            // Form data - convert to URLSearchParams or FormData format
            const formData = new URLSearchParams();
            for (const [key, value] of Object.entries(req.body)) {
              formData.append(key, String(value));
            }
            fetchOptions.body = formData.toString();
          }
        }
      }
    }

    // Fetch the content from the target URL
    const response = await fetch(targetUrl.toString(), fetchOptions);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch: ${response.statusText}`,
      });
    }

    // Get the content
    const contentType = response.headers.get("content-type") || "text/html";
    const content = await response.text();

    // Set response headers, removing X-Frame-Options and modifying CSP
    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Frame-Options", "ALLOWALL");
    
    // Remove or modify Content-Security-Policy to allow embedding
    const csp = response.headers.get("content-security-policy");
    if (csp) {
      // Modify CSP to allow framing and remove restrictions
      const modifiedCsp = csp
        .replace(/frame-ancestors[^;]*;?/gi, "")
        .replace(/frame-src[^;]*;?/gi, "frame-src *;")
        .replace(/form-action[^;]*;?/gi, "");
      res.setHeader("Content-Security-Policy", modifiedCsp);
    }

    // Only modify HTML content
    if (contentType.includes("text/html")) {
      let modifiedContent = content;
      const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;
      const proxyBase = `${req.protocol}://${req.get("host")}/api/proxy`;

      // Fix relative URLs in the HTML
      modifiedContent = modifiedContent.replace(
        /(href|src|action)=["']([^"']+)["']/gi,
        (match, attr, url) => {
          // Skip if already proxied
          if (url.includes('/api/proxy')) {
            return match;
          }
          
          if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) {
            // Route external URLs through proxy
            return `${attr}="${proxyBase}?url=${encodeURIComponent(url)}"`;
          }
          
          // Skip special protocols
          if (url.startsWith("javascript:") || url.startsWith("mailto:") || url.startsWith("#") || url.startsWith("data:") || url.startsWith("blob:")) {
            return match;
          }
          
          // Convert relative URLs to absolute, then proxy
          let absoluteUrl;
          if (url.startsWith("/")) {
            absoluteUrl = `${baseUrl}${url}`;
          } else {
            // Relative URL - need to resolve against current page URL
            try {
              const currentUrlObj = new URL(targetUrl.toString());
              absoluteUrl = new URL(url, currentUrlObj).toString();
            } catch (e) {
              absoluteUrl = `${baseUrl}/${url}`;
            }
          }
          return `${attr}="${proxyBase}?url=${encodeURIComponent(absoluteUrl)}"`;
        }
      );

      // Fix CSS url() references
      modifiedContent = modifiedContent.replace(
        /url\(["']?([^"')]+)["']?\)/gi,
        (match, url) => {
          if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//") || url.startsWith("data:")) {
            return match; // Already absolute or data URI
          }
          if (url.startsWith("/")) {
            return `url("${baseUrl}${url}")`;
          }
          return `url("${baseUrl}/${url}")`;
        }
      );

      // Inject proxy script to handle form submissions and navigation
      const proxyScript = `
<script>
(function() {
  const PROXY_BASE = '${proxyBase}';
  const BASE_URL = '${baseUrl}';
  let isSubmitting = false; // Prevent duplicate form submissions
  
  // Helper to check if URL should be proxied
  function shouldProxy(url) {
    if (!url) return false;
    if (url.includes('/api/proxy')) return false; // Already proxied
    if (url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('#') || url.startsWith('data:') || url.startsWith('blob:')) return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
  }
  
  // Helper to get proxied URL
  function getProxiedUrl(url) {
    if (!shouldProxy(url)) return url;
    // Resolve protocol-relative URLs
    if (url.startsWith('//')) {
      url = window.location.protocol + url;
    }
    return PROXY_BASE + '?url=' + encodeURIComponent(url);
  }
  
  // Override form.onsubmit handlers before they're set
  const originalFormSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function() {
    const form = this;
    const formAction = form.action || BASE_URL;
    let resolvedAction = formAction;
    
    // Resolve relative URLs
    if (!resolvedAction.startsWith('http://') && !resolvedAction.startsWith('https://') && !resolvedAction.startsWith('//')) {
      try {
        const currentPageUrl = window.location.href;
        if (currentPageUrl.includes('/api/proxy?url=')) {
          const urlMatch = currentPageUrl.match(/url=([^&]+)/);
          if (urlMatch) {
            const actualUrl = decodeURIComponent(urlMatch[1]);
            resolvedAction = new URL(resolvedAction, actualUrl).toString();
          } else {
            resolvedAction = new URL(resolvedAction, BASE_URL).toString();
          }
        } else {
          resolvedAction = new URL(resolvedAction, BASE_URL).toString();
        }
      } catch (err) {
        resolvedAction = BASE_URL;
      }
    }
    
    const formMethod = (form.method || 'GET').toUpperCase();
    const formData = new FormData(form);
    
    if (formMethod === 'GET') {
      const params = new URLSearchParams(formData);
      const url = resolvedAction + (resolvedAction.includes('?') ? '&' : '?') + params.toString();
      window.location.href = getProxiedUrl(url);
    } else {
      const proxiedUrl = getProxiedUrl(resolvedAction);
      fetch(proxiedUrl, {
        method: formMethod,
        body: formData,
        headers: {
          'Content-Type': form.enctype || 'application/x-www-form-urlencoded'
        }
      })
      .then(response => response.text())
      .then(html => {
        document.open();
        document.write(html);
        document.close();
      })
      .catch(err => console.error('Form submission error:', err));
    }
  };
  
  // Intercept form submissions (capture phase to run first)
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form && form.tagName === 'FORM') {
      // Prevent duplicate submissions
      if (isSubmitting) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      
      e.preventDefault();
      e.stopImmediatePropagation();
      isSubmitting = true;
      
      // Reset flag after a delay
      setTimeout(() => {
        isSubmitting = false;
      }, 2000);
      
      let formAction = form.action || BASE_URL;
      
      // Resolve relative URLs
      if (!formAction.startsWith('http://') && !formAction.startsWith('https://') && !formAction.startsWith('//')) {
        try {
          const currentPageUrl = window.location.href;
          if (currentPageUrl.includes('/api/proxy?url=')) {
            const urlMatch = currentPageUrl.match(/url=([^&]+)/);
            if (urlMatch) {
              const actualUrl = decodeURIComponent(urlMatch[1]);
              formAction = new URL(formAction, actualUrl).toString();
            } else {
              formAction = new URL(formAction, BASE_URL).toString();
            }
          } else {
            formAction = new URL(formAction, BASE_URL).toString();
          }
        } catch (err) {
          formAction = BASE_URL;
        }
      }
      
      const formMethod = (form.method || 'GET').toUpperCase();
      const formData = new FormData(form);
      
      if (formMethod === 'GET') {
        const params = new URLSearchParams(formData);
        const url = formAction + (formAction.includes('?') ? '&' : '?') + params.toString();
        window.location.href = getProxiedUrl(url);
      } else {
        const proxiedUrl = getProxiedUrl(formAction);
        fetch(proxiedUrl, {
          method: formMethod,
          body: formData,
          headers: {
            'Content-Type': form.enctype || 'application/x-www-form-urlencoded'
          }
        })
        .then(response => response.text())
        .then(html => {
          document.open();
          document.write(html);
          document.close();
        })
        .catch(err => console.error('Form submission error:', err));
      }
    }
  }, true);
  
  // Intercept Enter key in form inputs (for Google search)
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      // Prevent duplicate submissions
      if (isSubmitting) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const form = target.form;
        if (form && form.tagName === 'FORM') {
          // Trigger form submission - our submit handler will catch it
          e.preventDefault();
          e.stopPropagation();
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }
    }
  }, true);
  
  // Also intercept form submit button clicks (for Google search button)
  document.addEventListener('click', function(e) {
    const target = e.target;
    // Check if clicked element is a submit button inside a form
    if ((target.type === 'submit' || (target.tagName === 'BUTTON' && target.form)) && target.form) {
      const form = target.form;
      // Ensure form submission is handled
      if (form.tagName === 'FORM') {
        // The submit event will be triggered, our handler will catch it
      }
    }
  }, true);
  
  // Intercept link clicks
  document.addEventListener('click', function(e) {
    let target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    if (target && target.href) {
      const href = target.href;
      if (shouldProxy(href)) {
        e.preventDefault();
        window.location.href = getProxiedUrl(href);
      }
    }
  }, true);
  
  // Override window.location.href setter
  const originalLocation = window.location;
  let locationHrefDescriptor = Object.getOwnPropertyDescriptor(window, 'location') || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'location');
  
  if (locationHrefDescriptor && locationHrefDescriptor.set) {
    const originalSetter = locationHrefDescriptor.set;
    Object.defineProperty(window, 'location', {
      get: function() {
        return originalLocation;
      },
      set: function(url) {
        if (typeof url === 'string') {
          if (shouldProxy(url)) {
            originalSetter.call(window, getProxiedUrl(url));
          } else {
            originalSetter.call(window, url);
          }
        } else {
          originalSetter.call(window, url);
        }
      },
      configurable: true
    });
  }
})();
</script>`;

      // Inject script early in the document to run before other scripts
      // Try to inject right after <head> or at the start of <body>
      if (modifiedContent.includes("<head>")) {
        modifiedContent = modifiedContent.replace("<head>", "<head>" + proxyScript);
      } else if (modifiedContent.includes("<body")) {
        // Find the opening body tag and inject right after it
        modifiedContent = modifiedContent.replace(/(<body[^>]*>)/i, "$1" + proxyScript);
      } else if (modifiedContent.includes("</body>")) {
        modifiedContent = modifiedContent.replace("</body>", proxyScript + "</body>");
      } else if (modifiedContent.includes("</html>")) {
        modifiedContent = modifiedContent.replace("</html>", proxyScript + "</html>");
      } else {
        modifiedContent = proxyScript + modifiedContent;
      }

      res.send(modifiedContent);
    } else {
      // Non-HTML content (images, CSS, JS, etc.) - return as-is
      res.send(content);
    }
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error: error.message || "Failed to proxy request",
    });
  }
});

// Creator endpoint
app.post("/api/creator", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "Invalid request: prompt string is required",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OpenAI API key is not configured",
      });
    }

    const systemMessage = `You are an expert web developer. Your job is to generate a complete, FUNCTIONAL, runnable web application based on the user's description.

CRITICAL: The generated app MUST be fully functional. All buttons, inputs, and interactions MUST work correctly.

Generate ONLY valid HTML, CSS, and JavaScript code. Return your response as a JSON object with this exact structure:
{
  "name": "App Name",
  "html": "<!DOCTYPE html>...",
  "css": "/* CSS code */",
  "js": "// JavaScript code"
}

REQUIREMENTS:
1. HTML Structure:
   - Provide clean, semantic HTML
   - Include all necessary elements (buttons, inputs, containers)
   - Use proper IDs and classes for JavaScript targeting
   - Ensure all interactive elements have proper attributes (type, id, class)

2. CSS Styling:
   - Use modern CSS (flexbox/grid) for layout
   - Make it visually appealing and responsive
   - Use CSS variables for theming when appropriate
   - Ensure proper spacing and typography

3. JavaScript Functionality (CRITICAL):
   - ALL functionality MUST work correctly
   - Use proper event listeners (addEventListener)
   - Implement proper state management
   - Handle edge cases and errors
   - Use DOMContentLoaded or defer scripts properly
   - Test logic mentally before writing code

SPECIFIC APP PATTERNS:

For CALCULATORS:
- Store current value, previous value, and operator in variables
- Handle number button clicks: append digits, update display
- Handle operator clicks: perform previous operation, store new operator
- Handle equals: perform operation, display result
- Handle clear: reset all values
- Example structure:
  let currentValue = '0';
  let previousValue = null;
  let operator = null;
  function handleNumber(num) { /* append to currentValue */ }
  function handleOperator(op) { /* calculate previous, set new operator */ }
  function calculate() { /* perform operation */ }

For TODO LISTS:
- Maintain array of todos in JavaScript
- Render todos dynamically from array
- Handle add: push to array, re-render
- Handle delete: filter array, re-render
- Handle toggle: update item in array, re-render

For FORM APPS:
- Use proper form validation
- Handle submit events correctly
- Prevent default form submission when needed
- Show validation errors clearly

For DATA DISPLAY APPS:
- Fetch or define data structure
- Render data dynamically using map/forEach
- Handle filtering/sorting if needed

COMMON MISTAKES TO AVOID:
- Don't forget to attach event listeners
- Don't use inline event handlers (onclick="...") - use addEventListener
- Don't forget to update the DOM after state changes
- Don't hardcode values - use variables and state
- Don't forget to handle edge cases (empty inputs, division by zero, etc.)
- Ensure all functions are properly scoped and accessible

CODE QUALITY:
- Use clear variable names
- Add comments for complex logic
- Keep functions focused and single-purpose
- Ensure code runs when page loads (use DOMContentLoaded or defer)

VERIFICATION CHECKLIST:
Before finalizing code, verify:
✓ All buttons have click handlers attached
✓ All inputs have proper event listeners
✓ State is properly initialized
✓ Display updates when state changes
✓ Operations perform correctly
✓ Edge cases are handled

If the request is too complex, return a simple but FULLY FUNCTIONAL version that demonstrates the core concept. Functionality is more important than features.`;

    // Create chat completion
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      return res.status(500).json({
        error: "No response from OpenAI",
      });
    }

    try {
      const parsed = JSON.parse(responseContent);
      res.json({
        name: parsed.name || "Generated App",
        html: parsed.html || "",
        css: parsed.css || "",
        js: parsed.js || "",
      });
    } catch (parseError) {
      // Fallback: try to extract code from markdown or plain text
      res.status(500).json({
        error: "Failed to parse generated code. Please try again.",
      });
    }
  } catch (error) {
    console.error("OpenAI API error:", error);

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return res.status(401).json({
          error: "Invalid API key. Please check your OpenAI API key.",
        });
      }
      if (error.status === 429) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please try again later.",
        });
      }
      if (error.status === 500) {
        return res.status(500).json({
          error: "OpenAI service error. Please try again later.",
        });
      }
    }

    // Generic error
    res.status(500).json({
      error: error.message || "Failed to process creator request",
    });
  }
});

// Terminal execute endpoint
app.post("/api/terminal/execute", async (req, res) => {
  try {
    const { command, cwd } = req.body;

    if (!command || typeof command !== "string") {
      return res.status(400).json({
        error: "Invalid request: command string is required",
      });
    }

    // For now, return "command not found" for unknown commands
    // Built-in commands are handled in the frontend
    res.json({
      stdout: "",
      stderr: `${command}: command not found`,
      exitCode: 127,
    });
  } catch (error) {
    console.error("Terminal execute error:", error);
    res.status(500).json({
      error: error.message || "Failed to execute command",
    });
  }
});

// WebSocket server for Python REPL
const wss = new WebSocketServer({ server });

const pythonSessions = new Map();

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/").filter(Boolean);
  
  // Check if this is a terminal session request
  if (pathParts[0] !== "api" || pathParts[1] !== "terminal" || pathParts[2] !== "session") {
    ws.close(1008, "Invalid path");
    return;
  }

  const sessionId = pathParts[3];

  if (!sessionId) {
    ws.close(1008, "Session ID required");
    return;
  }

  console.log(`Python REPL session connected: ${sessionId}`);

  let pythonProcess = null;
  let isExiting = false;

  // Spawn Python process
  try {
    pythonProcess = spawn("python3", ["-u", "-i"], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    pythonSessions.set(sessionId, pythonProcess);

    // Handle Python stdout
    pythonProcess.stdout.on("data", (data) => {
      if (!isExiting && ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            type: "output",
            data: data.toString(),
          })
        );
      }
    });

    // Handle Python stderr
    pythonProcess.stderr.on("data", (data) => {
      if (!isExiting && ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: data.toString(),
          })
        );
      }
    });

    // Handle Python process exit
    pythonProcess.on("exit", (code) => {
      isExiting = true;
      pythonSessions.delete(sessionId);
      if (ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            type: "exit",
            data: `Process exited with code ${code}`,
          })
        );
        ws.close();
      }
    });

    // Send initial prompt
    ws.send(
      JSON.stringify({
        type: "prompt",
        data: "Python 3.x\n>>> ",
      })
    );

    // Handle WebSocket messages
    ws.on("message", (message) => {
      if (pythonProcess && !isExiting) {
        const input = message.toString();
        
        // Check for exit commands
        if (input.trim() === "exit()" || input.trim() === "exit" || input.trim() === "quit()") {
          pythonProcess.kill();
          return;
        }

        // Send input to Python process
        pythonProcess.stdin.write(input);
      }
    });

    // Handle WebSocket close
    ws.on("close", () => {
      if (pythonProcess && !pythonProcess.killed) {
        pythonProcess.kill();
      }
      pythonSessions.delete(sessionId);
      console.log(`Python REPL session disconnected: ${sessionId}`);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
      if (pythonProcess && !pythonProcess.killed) {
        pythonProcess.kill();
      }
      pythonSessions.delete(sessionId);
    });
  } catch (error) {
    console.error(`Failed to spawn Python process for session ${sessionId}:`, error);
    ws.send(
      JSON.stringify({
        type: "error",
        data: "Failed to start Python REPL. Make sure Python 3 is installed.",
      })
    );
    ws.close();
  }
});

server.listen(PORT, () => {
  console.log(`Chat proxy server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`WebSocket server ready for Python REPL sessions`);
});

