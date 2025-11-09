import { useEffect, useState, useMemo, useCallback } from "react";
import { useSpotlightStore } from "@/stores/spotlight-store";
import { useWindowManager } from "@/os/window-manager";
import { os } from "@/os/os-core";
import type { AppDefinition } from "@/components/StartMenu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FileText,
  FolderOpen,
  Settings,
  Camera,
  Calendar,
  MessageSquare,
  Sparkles,
  Globe,
  Image as ImageIcon,
  Music,
  Video,
  HardDrive,
  Sun,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FilesApp } from "@/os/apps/FilesApp";
import { SettingsApp } from "@/os/apps/SettingsApp";

interface SpotlightProps {
  apps: AppDefinition[];
}

interface SearchResult {
  type: "app" | "file" | "setting";
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onSelect: () => void;
  score: number; // For ranking
}

// Settings pages
const SETTINGS_PAGES = [
  { id: "appearance", name: "Appearance", icon: <Sun className="w-4 h-4" /> },
  { id: "backgrounds", name: "Backgrounds", icon: <ImageIcon className="w-4 h-4" /> },
  { id: "storage", name: "Storage", icon: <HardDrive className="w-4 h-4" /> },
  { id: "about", name: "About", icon: <Info className="w-4 h-4" /> },
];

// App icon mapping
const APP_ICONS: Record<string, React.ReactNode> = {
  notes: <FileText className="w-4 h-4" />,
  files: <FolderOpen className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  camera: <Camera className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
  chat: <MessageSquare className="w-4 h-4" />,
  creator: <Sparkles className="w-4 h-4" />,
  browser: <Globe className="w-4 h-4" />,
};

// Simple fuzzy match scoring
function fuzzyMatch(query: string, text: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  // Exact start match gets highest score
  if (lowerText.startsWith(lowerQuery)) {
    return 100;
  }

  // Contains match gets lower score
  if (lowerText.includes(lowerQuery)) {
    return 50;
  }

  // Check if all characters appear in order (simple fuzzy)
  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  if (queryIndex === lowerQuery.length) {
    return 25;
  }

  return 0;
}

function searchApps(query: string, apps: AppDefinition[]): SearchResult[] {
  if (!query.trim()) return [];

  const results: SearchResult[] = apps.map((app) => {
    const nameScore = fuzzyMatch(query, app.name);
    const descScore = fuzzyMatch(query, app.description) * 0.5; // Description matches weighted less
    const score = Math.max(nameScore, descScore);

    return {
      type: "app" as const,
      id: app.id,
      title: app.name,
      subtitle: app.description,
      icon: APP_ICONS[app.id] || <FileText className="w-4 h-4" />,
      onSelect: app.onLaunch,
      score,
    };
  });

  return results.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}

function searchFiles(query: string, onFileSelect: (filePath: string) => void): SearchResult[] {
  if (!query.trim()) return [];

  const allFiles = os.fs.getAllFiles();
  const results: SearchResult[] = [];

  for (const file of allFiles) {
    const nameScore = fuzzyMatch(query, file.name);
    const pathScore = fuzzyMatch(query, file.path) * 0.7; // Path matches weighted less
    const score = Math.max(nameScore, pathScore);

    if (score > 0) {
      // Get parent folder name
      const pathParts = file.path.split("/");
      const parentFolder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "Home";

      let icon = <FileText className="w-4 h-4" />;
      if (file.isFolder) {
        icon = <FolderOpen className="w-4 h-4" />;
      } else if (file.name.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i)) {
        icon = <ImageIcon className="w-4 h-4" />;
      } else if (file.name.match(/\.(mp3|wav|flac|ogg)$/i)) {
        icon = <Music className="w-4 h-4" />;
      } else if (file.name.match(/\.(mp4|avi|mov|mkv)$/i)) {
        icon = <Video className="w-4 h-4" />;
      }

      results.push({
        type: "file" as const,
        id: file.path,
        title: file.name,
        subtitle: parentFolder !== "Home" ? `in ${parentFolder}` : "Home",
        icon,
        onSelect: () => onFileSelect(file.path),
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

function searchSettings(query: string, onSettingSelect: (settingId: string) => void): SearchResult[] {
  if (!query.trim()) return [];

  const results: SearchResult[] = SETTINGS_PAGES.map((page) => {
    const score = fuzzyMatch(query, page.name);
    return {
      type: "setting" as const,
      id: page.id,
      title: page.name,
      icon: page.icon,
      onSelect: () => onSettingSelect(page.id),
      score,
    };
  });

  return results.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}

export function Spotlight({ apps }: SpotlightProps) {
  const { isOpen, query, setQuery, close } = useSpotlightStore();
  const { openWindow, getWindow, bringToFront, restoreWindow } = useWindowManager();
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Handlers for file and settings selection
  const handleFileSelect = useCallback(() => {
    // Open Files app
    openWindow("files-1", "Files", <FilesApp />, { width: 900, height: 600 });
    // Note: File navigation to specific folder would need to be implemented in FilesApp
    // For now, just open the Files app
  }, [openWindow]);

  const handleSettingSelect = useCallback(() => {
    // Open Settings app
    openWindow("settings-1", "Settings", <SettingsApp />);
    // Note: Settings navigation to specific section would need to be implemented
    // For now, just open the Settings app
  }, [openWindow]);

  // Search results
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return {
        apps: [],
        files: [],
        settings: [],
      };
    }

    const appResults = searchApps(debouncedQuery, apps);
    const fileResults = searchFiles(debouncedQuery, handleFileSelect);
    const settingsResults = searchSettings(debouncedQuery, handleSettingSelect);

    // Limit to 50 total results
    const allResults = [...appResults, ...fileResults, ...settingsResults]
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    return {
      apps: allResults.filter((r) => r.type === "app"),
      files: allResults.filter((r) => r.type === "file"),
      settings: allResults.filter((r) => r.type === "setting"),
    };
  }, [debouncedQuery, apps, handleFileSelect, handleSettingSelect]);

  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === "app") {
      // Check if app window exists
      const windowId = `${result.id}-1`;
      const existingWindow = getWindow(windowId);
      
      if (existingWindow) {
        // Window exists, bring to front and restore if minimized
        if (existingWindow.minimized) {
          restoreWindow(windowId);
        } else {
          bringToFront(windowId);
        }
      } else {
        // Window doesn't exist, launch app
        result.onSelect();
      }
    } else {
      // For files and settings, just call onSelect
      result.onSelect();
    }
    
    close();
  }, [getWindow, restoreWindow, bringToFront, close]);

  // Handle escape key - only close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000]"
            onClick={close}
          />

          {/* Spotlight Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", duration: 0.2 }}
            className="fixed left-1/2 top-1/4 transform -translate-x-1/2 w-[600px] max-w-[90vw] bg-background/95 backdrop-blur-xl rounded-lg shadow-2xl border border-border z-[10001]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Command 
              className="rounded-lg border-none"
              shouldFilter={false}
              loop={true}
              onKeyDown={(e) => {
                // Prevent backdrop from closing on Enter
                if (e.key === "Enter") {
                  e.stopPropagation();
                }
              }}
            >
              <CommandInput
                placeholder="Search apps, files, and settings..."
                value={query}
                onValueChange={setQuery}
                autoFocus
              />
              <CommandList>
                {results.apps.length === 0 &&
                  results.files.length === 0 &&
                  results.settings.length === 0 ? (
                  <CommandEmpty>
                    {debouncedQuery.trim() ? "No results found." : "Start typing to search..."}
                  </CommandEmpty>
                ) : (
                  <>
                    {results.apps.length > 0 && (
                      <CommandGroup heading="Apps">
                        {results.apps.map((result) => (
                          <CommandItem
                            key={result.id}
                            value={`app-${result.id}`}
                            onSelect={(value) => {
                              // This should fire on both keyboard Enter and mouse click
                              if (value === `app-${result.id}`) {
                                handleSelect(result);
                              }
                            }}
                            onPointerDown={(e) => {
                              // Handle mouse clicks explicitly
                              if (e.button === 0) {
                                e.stopPropagation();
                                handleSelect(result);
                              }
                            }}
                            className="cursor-pointer"
                            data-value={`app-${result.id}`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {result.icon}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{result.title}</div>
                                {result.subtitle && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {result.subtitle}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {results.files.length > 0 && (
                      <>
                        {results.apps.length > 0 && <CommandSeparator />}
                        <CommandGroup heading="Files">
                          {results.files.map((result) => (
                            <CommandItem
                              key={result.id}
                              value={`file-${result.id}`}
                              onSelect={(value) => {
                                if (value === `file-${result.id}`) {
                                  handleSelect(result);
                                }
                              }}
                              onPointerDown={(e) => {
                                // Handle mouse clicks explicitly
                                if (e.button === 0) {
                                  e.stopPropagation();
                                  handleSelect(result);
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {result.icon}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{result.title}</div>
                                  {result.subtitle && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      {result.subtitle}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}

                    {results.settings.length > 0 && (
                      <>
                        {(results.apps.length > 0 || results.files.length > 0) && (
                          <CommandSeparator />
                        )}
                        <CommandGroup heading="Settings">
                          {results.settings.map((result) => (
                            <CommandItem
                              key={result.id}
                              value={`setting-${result.id}`}
                              onSelect={(value) => {
                                if (value === `setting-${result.id}`) {
                                  handleSelect(result);
                                }
                              }}
                              onPointerDown={(e) => {
                                // Handle mouse clicks explicitly
                                if (e.button === 0) {
                                  e.stopPropagation();
                                  handleSelect(result);
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {result.icon}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{result.title}</div>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

