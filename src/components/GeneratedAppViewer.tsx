import { useEffect, useRef } from "react";
import type { CreatedApp } from "@/stores/creator-store";

interface GeneratedAppViewerProps {
  app: CreatedApp;
}

export function GeneratedAppViewer({ app }: GeneratedAppViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;

    if (!doc) return;

    // Combine HTML, CSS, and JS into a complete HTML document
    const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${app.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      width: 100%;
      height: 100%;
      overflow: auto;
    }
    ${app.css}
  </style>
</head>
<body>
  ${app.html.replace(/<!DOCTYPE html>|<\/?html>|<\/?head>|<\/?body>/gi, '').trim()}
  <script>
    ${app.js}
  </script>
</body>
</html>
    `.trim();

    doc.open();
    doc.write(fullHTML);
    doc.close();
  }, [app]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      className="w-full h-full border-0"
      title={app.name}
      style={{ backgroundColor: '#fff' }}
    />
  );
}

