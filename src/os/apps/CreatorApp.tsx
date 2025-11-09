import { useEffect, useState } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import type { CreatedApp } from "@/stores/creator-store";
import { generateApp } from "@/services/creator-api";
import { useWindowManager } from "@/os/window-manager";
import { GeneratedAppViewer } from "@/components/GeneratedAppViewer";
import { os } from "@/os/os-core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Trash2,
  Plus,
  FileCode,
  Play,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";

// Complexity checking function
function isPromptTooComplex(prompt: string): boolean {
  const wordCount = prompt.trim().split(/\s+/).length;
  
  if (wordCount > 200) {
    return true;
  }
  
  const complexPhrases = [
    "full production",
    "multi-tenant",
    "distributed microservices",
    "hardware",
    "embedded system",
    "enterprise",
    "scalable infrastructure",
    "kubernetes",
    "docker swarm",
    "load balancer",
    "database cluster",
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  return complexPhrases.some(phrase => lowerPrompt.includes(phrase));
}

// Creator Sidebar Component
function CreatorSidebar() {
  const {
    createdApps,
    selectedAppId,
    selectCreatedApp,
    deleteCreatedApp,
  } = useCreatorStore();
  
  const handleSelectApp = (appId: string) => {
    selectCreatedApp(appId);
  };
  
  const handleDeleteApp = (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this app?")) {
      deleteCreatedApp(appId);
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: new Date(timestamp).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };
  
  return (
    <div className="w-64 border-r border-border bg-muted/30 flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="text-sm font-semibold mb-2">Created Apps</div>
        <div className="text-xs text-muted-foreground">
          {createdApps.length} {createdApps.length === 1 ? "app" : "apps"}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {createdApps.map((app) => {
            const isActive = app.id === selectedAppId;
            
            return (
              <div
                key={app.id}
                className={cn(
                  "group flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                  isActive ? "bg-primary/10" : "hover:bg-muted"
                )}
                onClick={() => handleSelectApp(app.id)}
              >
                <FileCode className="w-4 h-4 shrink-0 opacity-70 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate mb-1">
                    {app.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimestamp(app.createdAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteApp(e, app.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-opacity"
                  title="Delete app"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            );
          })}
          {createdApps.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No apps yet. Create your first one!
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function CreatorApp() {
  const {
    createdApps,
    selectedAppId,
    isLoading,
    error,
    addCreatedApp,
    selectCreatedApp,
    setLoading,
    setError,
    loadCreatedApps,
  } = useCreatorStore();
  
  const { openWindow } = useWindowManager();
  const [prompt, setPrompt] = useState("");
  
  // Load apps on mount
  useEffect(() => {
    loadCreatedApps().catch((err) => {
      console.error("Failed to load apps:", err);
      setError("Failed to load apps. Please refresh the page.");
    });
  }, [loadCreatedApps]);
  
  
  const selectedApp = selectedAppId 
    ? createdApps.find(app => app.id === selectedAppId)
    : null;
  
  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    
    if (!trimmedPrompt) {
      setError("Please enter a description of the app you want to build.");
      return;
    }
    
    // Complexity check
    if (isPromptTooComplex(trimmedPrompt)) {
      setError("I'm sorry — this request is currently too complex for automated creation, but I'm working on improving this capability. Please check back later.");
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      const generated = await generateApp(trimmedPrompt);
      
      // Add to store
      const appId = addCreatedApp(
        generated.name,
        trimmedPrompt,
        generated.html,
        generated.css,
        generated.js
      );
      selectCreatedApp(appId);
      
      // Save to filesystem
      try {
        // Create CreatorApps folder if it doesn't exist
        if (!os.fs.exists("CreatorApps")) {
          os.fs.createFolder("CreatorApps", "");
        }
        
        // Save app files
        const folderPath = `CreatorApps/${appId}`;
        if (!os.fs.exists(folderPath)) {
          os.fs.createFolder(appId, "CreatorApps");
        }
        
        os.fs.writeFile("index.html", generated.html, folderPath);
        os.fs.writeFile("style.css", generated.css, folderPath);
        os.fs.writeFile("app.js", generated.js, folderPath);
      } catch (fsError) {
        // Non-critical error - log but don't show to user
        console.warn("Failed to save app to filesystem:", fsError);
      }
      
      // Clear prompt
      setPrompt("");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate app";
      setError(errorMessage);
      console.error("Creator error:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleNewPrompt = () => {
    setPrompt("");
    setError(null);
    selectCreatedApp(null);
  };
  
  const handleLaunchApp = (app: CreatedApp) => {
    openWindow(
      `generated-${app.id}`,
      app.name,
      <GeneratedAppViewer app={app} />,
      { width: 800, height: 600 }
    );
  };
  
  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Creator</h1>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <CreatorSidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {!selectedApp ? (
            // Prompt Input View
            <div className="flex-1 flex flex-col p-6 gap-4 overflow-auto">
              <div className="flex-1 flex flex-col gap-4">
                {/* Instructions */}
                <Alert className="bg-muted/50 border-border">
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold mb-2">Tips for Creating Apps</AlertTitle>
                  <AlertDescription className="text-xs space-y-1.5">
                    <div className="font-medium">Be specific about functionality:</div>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                      <li>For calculators: "A working calculator with +, -, ×, ÷ operations and clear button"</li>
                      <li>For todo lists: "A todo app where I can add tasks, mark them complete, and delete them"</li>
                      <li>For forms: "A contact form with name, email fields and submit button"</li>
                    </ul>
                    <div className="font-medium mt-2">What works best:</div>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                      <li>Simple, focused apps with clear functionality</li>
                      <li>Apps that use standard HTML/CSS/JavaScript</li>
                      <li>Single-page applications</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Describe the app you want to build
                  </label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A working calculator with addition, subtraction, multiplication, division, clear button, and a display screen..."
                    className="min-h-[200px] resize-none text-sm"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={isLoading || !prompt.trim()}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate App
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground text-center">
                  Press Cmd/Ctrl + Enter to generate
                </div>
              </div>
            </div>
          ) : (
            // App Display View
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="p-6 border-b border-border shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">{selectedApp.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedApp.prompt}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleLaunchApp(selectedApp)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Launch App
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNewPrompt}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New App
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden">
                {selectedApp.html && selectedApp.css && selectedApp.js ? (
                  <GeneratedAppViewer app={selectedApp} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>App data is incomplete. Please regenerate this app.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
