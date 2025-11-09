import { useEffect, useRef, useState } from "react";
import { useBrowserStore } from "@/stores/browser-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, RotateCw, X, ExternalLink, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function normalizeInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  // Check if it looks like a URL (contains dots and no spaces, or starts with www.)
  const looksLikeUrl = 
    (trimmed.includes(".") && !trimmed.includes(" ")) ||
    trimmed.startsWith("www.") ||
    trimmed.match(/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/);
  
  if (looksLikeUrl) {
    // Add https:// if missing
    return trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  }
  // Otherwise treat as search query
  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
}

function getProxyUrl(url: string): string {
  // Check if it's a localhost URL - don't proxy those
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1" || urlObj.hostname.startsWith("192.168.") || urlObj.hostname.startsWith("10.")) {
      return url; // Don't proxy localhost
    }
  } catch (e) {
    // Invalid URL, return as-is
    return url;
  }
  
  // Route all external URLs through the proxy
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
  return proxyUrl;
}

function getTabTitle(url: string): string {
  if (!url) return "New Tab";
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url.length > 30 ? url.substring(0, 30) + "..." : url;
  }
}

export function BrowserApp() {
  const {
    tabs,
    activeTabId,
    setUrl,
    back,
    forward,
    newTab,
    closeTab,
    setActiveTab,
    loadTabs,
  } = useBrowserStore();

  const [addressBarValue, setAddressBarValue] = useState("");
  const [blockedUrls, setBlockedUrls] = useState<Set<string>>(new Set());
  const iframeRefs = useRef<Record<string, HTMLIFrameElement>>({});
  const loadTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Set up timeout to detect blocked pages (only for non-proxied URLs)
  const setupLoadTimeout = (tabId: string, url: string) => {
    // Clear existing timeout
    if (loadTimeouts.current[tabId]) {
      clearTimeout(loadTimeouts.current[tabId]);
    }

    // Don't set timeout for proxied URLs - they should work fine
    const isProxied = getProxyUrl(url).includes('/api/proxy');
    if (isProxied) {
      return;
    }

    // Set a timeout - if iframe doesn't load within 5 seconds, assume it's blocked
    loadTimeouts.current[tabId] = setTimeout(() => {
      const iframe = iframeRefs.current[tabId];
      if (iframe) {
        try {
          // Try to access contentWindow
          const contentWindow = iframe.contentWindow;
          if (!contentWindow) {
            // contentWindow is null - page is likely blocked
            setBlockedUrls((prev) => new Set(prev).add(url));
          }
        } catch (e) {
          // Can't access - might be blocked or cross-origin
          // Check if we can see the iframe's src
          const iframeSrc = iframe.src;
          if (iframeSrc && !iframeSrc.includes('/api/proxy')) {
            // If src matches but we can't access and it's not proxied, it's likely blocked
            setBlockedUrls((prev) => new Set(prev).add(url));
          }
        }
      }
      delete loadTimeouts.current[tabId];
    }, 5000);
  };

  // Load tabs on mount
  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  // Update address bar when active tab changes
  useEffect(() => {
    if (activeTabId) {
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (activeTab) {
        setAddressBarValue(activeTab.url);
        // Set up load timeout when tab URL changes
        if (activeTab.url) {
          setupLoadTimeout(activeTabId, activeTab.url);
        }
      }
    }
  }, [activeTabId, tabs]);


  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(loadTimeouts.current).forEach((timeout) => {
        clearTimeout(timeout);
      });
    };
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleAddressBarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTabId) return;

    const normalizedUrl = normalizeInput(addressBarValue);
    if (normalizedUrl) {
      setUrl(activeTabId, normalizedUrl);
      // Update address bar to show the normalized URL
      setAddressBarValue(normalizedUrl);
      // Clear blocked status when navigating to a new URL
      // Proxied URLs are never blocked
      setBlockedUrls((prev) => {
        const next = new Set(prev);
        next.delete(normalizedUrl);
        return next;
      });
      
      // Force iframe reload by updating the ref
      const iframe = iframeRefs.current[activeTabId];
      if (iframe) {
        const proxyUrl = getProxyUrl(normalizedUrl);
        iframe.src = proxyUrl;
      }
    }
  };

  const handleBack = () => {
    if (activeTabId) {
      back(activeTabId);
    }
  };

  const handleForward = () => {
    if (activeTabId) {
      forward(activeTabId);
    }
  };

  const handleRefresh = () => {
    if (activeTabId && activeTab) {
      const iframe = iframeRefs.current[activeTabId];
      if (iframe && activeTab.url) {
        iframe.src = activeTab.url;
      }
    }
  };

  const handleNewTab = () => {
    newTab();
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleIframeLoad = (tabId: string) => {
    
    // Clear timeout if it exists
    if (loadTimeouts.current[tabId]) {
      clearTimeout(loadTimeouts.current[tabId]);
      delete loadTimeouts.current[tabId];
    }

    const tab = tabs.find((t) => t.id === tabId);
    if (!tab?.url) return;

    // Check if this is a proxied URL - proxied URLs should never be blocked
    const isProxied = getProxyUrl(tab.url).includes('/api/proxy');
    
    if (isProxied) {
      // Proxied URLs are never blocked - clear from blocked set
      setBlockedUrls((prev) => {
        const next = new Set(prev);
        next.delete(tab.url);
        return next;
      });
      
      // Try to update URL if iframe navigated
      try {
        const iframe = iframeRefs.current[tabId];
        if (iframe) {
          const contentWindow = iframe.contentWindow;
          if (contentWindow) {
            try {
              const currentUrl = contentWindow.location.href;
              // Extract the actual URL from proxy URL if present
              if (currentUrl.includes('/api/proxy')) {
                try {
                  const proxyUrlObj = new URL(currentUrl);
                  const targetUrlParam = proxyUrlObj.searchParams.get('url');
                  
                  if (targetUrlParam) {
                    let actualUrl = decodeURIComponent(targetUrlParam);
                    
                    // Copy all query parameters from proxy URL to actual URL (except 'url')
                    proxyUrlObj.searchParams.forEach((value, key) => {
                      if (key !== 'url') {
                        const urlObj = new URL(actualUrl);
                        urlObj.searchParams.set(key, value);
                        actualUrl = urlObj.toString();
                      }
                    });
                    
                    if (actualUrl !== tab.url) {
                      // Update the tab URL - React will remount the iframe due to the key prop
                      setUrl(tabId, actualUrl);
                    }
                  }
                } catch (e) {
                  // URL parsing failed, try fallback method
                  const urlMatch = currentUrl.match(/url=([^&]+)/);
                  if (urlMatch) {
                    const actualUrl = decodeURIComponent(urlMatch[1]);
                    if (actualUrl !== tab.url) {
                      setUrl(tabId, actualUrl);
                    }
                  }
                }
              }
            } catch (e) {
              // Can't access location - try to detect via iframe src
              const iframeSrc = iframe.src;
              if (iframeSrc && iframeSrc.includes('/api/proxy?url=')) {
                const urlMatch = iframeSrc.match(/url=([^&]+)/);
                if (urlMatch) {
                  let actualUrl = decodeURIComponent(urlMatch[1]);
                  // Extract query params from iframe src
                  const iframeUrlObj = new URL(iframeSrc);
                  iframeUrlObj.searchParams.forEach((value, key) => {
                    if (key !== 'url') {
                      const urlObj = new URL(actualUrl);
                      urlObj.searchParams.set(key, value);
                      actualUrl = urlObj.toString();
                    }
                  });
                  if (actualUrl !== tab.url) {
                    setUrl(tabId, actualUrl);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // Ignore errors for proxied content
      }
      return;
    }

    // For non-proxied URLs, try to detect if iframe is blocked
    try {
      const iframe = iframeRefs.current[tabId];
      if (iframe) {
        // Try to access contentWindow - this will throw if blocked
        const contentWindow = iframe.contentWindow;
        if (contentWindow) {
          // If we can access contentWindow, the iframe is not blocked
          setBlockedUrls((prev) => {
            const next = new Set(prev);
            next.delete(tab.url);
            return next;
          });
          
          // Try to update the URL if the iframe navigated
          try {
            const currentUrl = contentWindow.location.href;
            if (currentUrl !== tab.url && !currentUrl.includes('/api/proxy')) {
              setUrl(tabId, currentUrl);
            }
          } catch (e) {
            // Can't access location due to cross-origin - that's normal for non-proxied
          }
        } else {
          // contentWindow is null - likely blocked (only for non-proxied)
          setBlockedUrls((prev) => new Set(prev).add(tab.url));
        }
      }
    } catch (e) {
      // Iframe is blocked - can't access contentWindow (only for non-proxied)
      setBlockedUrls((prev) => new Set(prev).add(tab.url));
    }
  };

  const handleIframeError = (tabId: string) => {
    
    // Clear timeout if it exists
    if (loadTimeouts.current[tabId]) {
      clearTimeout(loadTimeouts.current[tabId]);
      delete loadTimeouts.current[tabId];
    }

    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.url) {
      setBlockedUrls((prev) => new Set(prev).add(tab.url));
    }
  };

  const handleOpenExternal = (url: string) => {
    window.open(url, "_blank");
  };

  const canGoBack = activeTab ? activeTab.historyIndex > 0 : false;
  const canGoForward = activeTab
    ? activeTab.historyIndex < activeTab.history.length - 1
    : false;

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p>Loading browser...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Navigation Bar */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleBack}
            disabled={!canGoBack}
            title="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleForward}
            disabled={!canGoForward}
            title="Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={!activeTab?.url}
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
        <form onSubmit={handleAddressBarSubmit} className="flex-1 min-w-0">
          <Input
            type="text"
            value={addressBarValue}
            onChange={(e) => setAddressBarValue(e.target.value)}
            placeholder="Enter URL or search query..."
            className="w-full"
          />
        </form>
      </div>

      {/* Tabs */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Tabs value={activeTabId || undefined} onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">
          <div className="border-b border-border flex-shrink-0">
            <TabsList className="w-full justify-start h-auto p-1 bg-transparent rounded-none border-none">
              <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 px-3 py-1.5 max-w-[200px] data-[state=active]:bg-background"
                  >
                    <span className="truncate text-xs">
                      {getTabTitle(tab.url)}
                    </span>
                    {tabs.length > 1 && (
                      <button
                        onClick={(e) => handleCloseTab(tab.id, e)}
                        className="ml-1 hover:bg-muted rounded p-0.5"
                        title="Close tab"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </TabsTrigger>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewTab}
                  className="ml-1 shrink-0"
                  title="New tab"
                >
                  +
                </Button>
              </div>
            </TabsList>
          </div>

          {/* Tab Content */}
          {tabs.map((tab) => {
            const isTabBlocked = blockedUrls.has(tab.url);
            return (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="flex-1 m-0 mt-0 overflow-hidden min-h-0"
              >
                {isTabBlocked && tab.url ? (
                  <div className="flex items-center justify-center h-full p-8">
                    <Alert variant="destructive" className="max-w-md">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Site Cannot Be Embedded</AlertTitle>
                      <AlertDescription className="mt-2">
                        <p className="mb-4">
                          This site does not allow embedding (X-Frame-Options).
                        </p>
                        <Button
                          onClick={() => handleOpenExternal(tab.url)}
                          variant="outline"
                          className="w-full"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open in new tab (external browser)
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : tab.url ? (
                  <iframe
                    key={`${tab.id}-${tab.url}`}
                    ref={(el) => {
                      if (el) {
                        iframeRefs.current[tab.id] = el;
                        // Set up load timeout when iframe is mounted
                        setupLoadTimeout(tab.id, tab.url);
                      }
                    }}
                    src={getProxyUrl(tab.url)}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    className="w-full h-full border-0"
                    onLoad={() => handleIframeLoad(tab.id)}
                    onError={() => handleIframeError(tab.id)}
                    title={`Browser tab: ${getTabTitle(tab.url)}`}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <p className="text-lg mb-2">New Tab</p>
                      <p className="text-sm">Enter a URL or search query to get started</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}

