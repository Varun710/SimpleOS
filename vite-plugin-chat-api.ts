import type { Plugin } from "vite";
import type { Connect } from "vite";
import type { ServerResponse } from "http";
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured in .env file");
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export function chatApiPlugin(): Plugin {
  return {
    name: "chat-api",
    configureServer(server) {
      // Chat endpoint
      server.middlewares.use("/api/chat", (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        // Only handle POST requests
        if (req.method !== "POST") {
          return next();
        }

        // Parse request body
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            const data = JSON.parse(body);
            const { messages } = data;

            if (!messages || !Array.isArray(messages)) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                error: "Invalid request: messages array is required",
              }));
              return;
            }

            // Get OpenAI client
            const client = getOpenAIClient();

            // Prepare messages for OpenAI API
            const openaiMessages = messages.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
            }));

            // Create chat completion
            const completion = await client.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: openaiMessages,
              temperature: 0.7,
              max_tokens: 1000,
            });

            const assistantMessage = completion.choices[0]?.message?.content;

            if (!assistantMessage) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                error: "No response from OpenAI",
              }));
              return;
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              message: assistantMessage,
            }));
          } catch (error: any) {
            console.error("OpenAI API error:", error);

            let statusCode = 500;
            let errorMessage = "Failed to process chat request";

            // Handle specific OpenAI errors
            if (error instanceof OpenAI.APIError) {
              if (error.status === 401) {
                statusCode = 401;
                errorMessage = "Invalid API key. Please check your OpenAI API key.";
              } else if (error.status === 429) {
                statusCode = 429;
                errorMessage = "Rate limit exceeded. Please try again later.";
              } else if (error.status === 500) {
                statusCode = 500;
                errorMessage = "OpenAI service error. Please try again later.";
              } else {
                errorMessage = error.message || errorMessage;
              }
            } else if (error.message) {
              errorMessage = error.message;
            }

            res.writeHead(statusCode, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              error: errorMessage,
            }));
          }
        });
      });

      // Creator endpoint
      server.middlewares.use("/api/creator", (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        // Only handle POST requests
        if (req.method !== "POST") {
          return next();
        }

        // Parse request body
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            const data = JSON.parse(body);
            const { prompt } = data;

            if (!prompt || typeof prompt !== "string") {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                error: "Invalid request: prompt string is required",
              }));
              return;
            }

            // Get OpenAI client
            const client = getOpenAIClient();

            const systemMessage = `You are an expert web developer. Your job is to generate a complete, runnable web application based on the user's description.

Generate ONLY valid HTML, CSS, and JavaScript code. Return your response as a JSON object with this exact structure:
{
  "name": "App Name",
  "html": "<!DOCTYPE html>...",
  "css": "/* CSS code */",
  "js": "// JavaScript code"
}

Requirements:
- The HTML should be a complete, self-contained page
- The CSS should be embedded in a <style> tag or provided separately
- The JavaScript should be embedded in a <script> tag or provided separately
- Make it functional and visually appealing
- Use modern CSS (flexbox/grid) for layout
- Keep it simple but complete
- The app should work standalone in a browser

If the request is too complex, return a simple but working version that demonstrates the core concept.`;

            // Create chat completion
            const completion = await client.chat.completions.create({
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
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                error: "No response from OpenAI",
              }));
              return;
            }

            try {
              const parsed = JSON.parse(responseContent);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                name: parsed.name || "Generated App",
                html: parsed.html || "",
                css: parsed.css || "",
                js: parsed.js || "",
              }));
            } catch (parseError) {
              // Fallback: try to extract code from markdown or plain text
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                error: "Failed to parse generated code. Please try again.",
              }));
            }
          } catch (error: any) {
            console.error("OpenAI API error:", error);

            let statusCode = 500;
            let errorMessage = "Failed to process creator request";

            // Handle specific OpenAI errors
            if (error instanceof OpenAI.APIError) {
              if (error.status === 401) {
                statusCode = 401;
                errorMessage = "Invalid API key. Please check your OpenAI API key.";
              } else if (error.status === 429) {
                statusCode = 429;
                errorMessage = "Rate limit exceeded. Please try again later.";
              } else if (error.status === 500) {
                statusCode = 500;
                errorMessage = "OpenAI service error. Please try again later.";
              } else {
                errorMessage = error.message || errorMessage;
              }
            } else if (error.message) {
              errorMessage = error.message;
            }

            res.writeHead(statusCode, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              error: errorMessage,
            }));
          }
        });
      });

      // Proxy endpoint - bypasses X-Frame-Options
      server.middlewares.use("/api/proxy", async (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        try {
          const url = new URL(req.url || "", `http://${req.headers.host}`);
          const targetUrl = url.searchParams.get("url");

          if (!targetUrl) {
            // If no url parameter, this might be a direct request - pass to next middleware
            // This can happen with some asset requests or malformed URLs
            console.warn("Proxy request without url parameter:", req.url);
            return next();
          }

          // Validate URL
          let parsedUrl;
          try {
            parsedUrl = new URL(targetUrl);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              error: "Invalid URL format",
            }));
            return;
          }

          // Only allow http and https protocols
          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              error: "Only http and https protocols are allowed",
            }));
            return;
          }

          // Handle POST/PUT/DELETE requests (form submissions)
          const method = req.method || "GET";
          const fetchOptions: RequestInit = {
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
            let body = "";
            req.on("data", (chunk) => {
              body += chunk.toString();
            });

            await new Promise<void>((resolve) => {
              req.on("end", () => {
                fetchOptions.body = body;
                // Preserve content-type if present
                const contentType = req.headers["content-type"];
                if (contentType) {
                  (fetchOptions.headers as Record<string, string>)["Content-Type"] = contentType;
                }
                resolve();
              });
            });
          }

          // Fetch the content from the target URL
          const response = await fetch(parsedUrl.toString(), fetchOptions);

          if (!response.ok) {
            res.writeHead(response.status, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              error: `Failed to fetch: ${response.statusText}`,
            }));
            return;
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
            const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
            const proxyBase = `http://${req.headers.host}/api/proxy`;

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
                    const currentUrlObj = new URL(parsedUrl.toString());
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
      e.preventDefault();
      e.stopImmediatePropagation();
      
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

            res.writeHead(200, { "Content-Type": contentType });
            res.end(modifiedContent);
          } else {
            // Non-HTML content (images, CSS, JS, etc.) - return as-is
            res.writeHead(200, { "Content-Type": contentType });
            res.end(content);
          }
        } catch (error: any) {
          console.error("Proxy error:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            error: error.message || "Failed to proxy request",
          }));
        }
      });
    },
  };
}

