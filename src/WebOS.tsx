import { useState, useEffect, useMemo } from "react";
import type React from "react";
import type { ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { useWindowManager } from "@/os/window-manager";
import { os } from "@/os/os-core";
import { Window } from "@/components/Window";
import { Desktop, type DesktopIcon } from "@/components/Desktop";
import { Dock } from "@/components/Dock";
import { StartMenu, type AppDefinition } from "@/components/StartMenu";
import { Spotlight } from "@/components/Spotlight";
import { useSpotlightStore } from "@/stores/spotlight-store";
import { Toaster } from "@/components/ui/sonner";

// Import apps
import { NotesApp } from "@/os/apps/NotesApp";
import { FilesApp } from "@/os/apps/FilesApp";
import { SettingsApp } from "@/os/apps/SettingsApp";
import { CameraApp } from "@/os/apps/CameraApp";
import { CalendarApp } from "@/os/apps/CalendarApp";
import { ChatApp } from "@/os/apps/ChatApp";
import { CreatorApp } from "@/os/apps/CreatorApp";
import { BrowserApp } from "@/os/apps/BrowserApp";
import { TerminalApp } from "@/os/apps/TerminalApp";

// Widgets
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";

// Icons
import {
  FileText,
  FolderOpen,
  Settings,
  Camera,
  Calendar,
  MessageSquare,
  Sparkles,
  Globe,
  Terminal,
} from "lucide-react";

// Wallpaper presets matching SettingsApp
const WALLPAPER_PRESETS: Record<
  string,
  { background: string; type: "image" | "gradient" }
> = {
  "light-default": { background: "url(/background.jpg)", type: "image" },
  "light-gradient-blue": {
    background: "linear-gradient(to bottom, #87CEEB, #E0F6FF)",
    type: "gradient",
  },
  "light-gradient-purple": {
    background: "linear-gradient(to bottom, #E6E6FA, #F0E6FF)",
    type: "gradient",
  },
  "light-gradient-green": {
    background: "linear-gradient(to bottom, #98FB98, #F0FFF0)",
    type: "gradient",
  },
  "light-gradient-orange": {
    background: "linear-gradient(to bottom, #FFE4B5, #FFF8DC)",
    type: "gradient",
  },
  "light-gradient-gray": {
    background: "linear-gradient(to bottom, #F5F5F5, #E8E8E8)",
    type: "gradient",
  },
  "dark-default": {
    background: "linear-gradient(to bottom right, #1a1a2e, #16213e, #0f3460)",
    type: "gradient",
  },
  "dark-gradient-purple": {
    background: "linear-gradient(to bottom right, #1a1a2e, #16213e, #533483)",
    type: "gradient",
  },
  "dark-gradient-blue": {
    background: "linear-gradient(to bottom right, #0f3460, #16213e, #1a1a2e)",
    type: "gradient",
  },
  "dark-gradient-green": {
    background: "linear-gradient(to bottom right, #1a2e1a, #2d4a2d, #1a1a2e)",
    type: "gradient",
  },
  "dark-gradient-red": {
    background: "linear-gradient(to bottom right, #2e1a1a, #4a2d2d, #1a1a2e)",
    type: "gradient",
  },
  "dark-gradient-cyan": {
    background: "linear-gradient(to bottom right, #1a2e2e, #2d4a4a, #0f3460)",
    type: "gradient",
  },
};

function getWallpaperStyle(
  wallpaperId: string | null,
  theme: "light" | "dark"
): React.CSSProperties {
  const defaultId = theme === "light" ? "light-default" : "dark-default";
  const selectedId = wallpaperId || defaultId;
  const preset = WALLPAPER_PRESETS[selectedId] || WALLPAPER_PRESETS[defaultId];

  if (preset.type === "image") {
    return {
      backgroundImage: preset.background,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundColor: theme === "light" ? "#f0f0f0" : undefined,
    };
  } else {
    // Gradient
    return {
      background: preset.background,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
}

export function WebOS() {
  const { windows, openWindow } = useWindowManager();
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(os.settings.getTheme());
  const [wallpaper, setWallpaper] = useState<string | null>(
    os.settings.getWallpaper()
  );

  // Apply theme to document
  useEffect(() => {
    const applyTheme = (newTheme: "light" | "dark") => {
      setTheme(newTheme);
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    // Apply initial theme
    applyTheme(os.settings.getTheme());

    // Listen for theme changes
    os.bus.on("theme-changed", applyTheme);
    return () => os.bus.off("theme-changed", applyTheme);
  }, []);

  // Listen for wallpaper changes
  useEffect(() => {
    const handleWallpaperChange = (newWallpaper: string | null) => {
      setWallpaper(newWallpaper);
    };
    os.bus.on("wallpaper-changed", handleWallpaperChange);

    // Also load initial wallpaper on mount
    const initialWallpaper = os.settings.getWallpaper();
    setWallpaper(initialWallpaper);

    return () => os.bus.off("wallpaper-changed", handleWallpaperChange);
  }, []);

  // Global keyboard listener for Spotlight (Cmd+U / Ctrl+U)
  const { open: openSpotlight, close: closeSpotlight } = useSpotlightStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[cmdk-input]") !== null;

      // Check for Cmd+U (Mac) or Ctrl+U (Windows/Linux)
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      // Check for "u" or "U" key (case-insensitive)
      const isUKey =
        e.key === "u" || e.key === "U" || e.keyCode === 85 || e.code === "KeyU";

      // Only trigger if modifier is pressed, U key is pressed, and not typing in an input
      if (
        modifierKey &&
        isUKey &&
        !e.shiftKey &&
        !e.altKey &&
        !isInputElement
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const { isOpen } = useSpotlightStore.getState();
        if (isOpen) {
          closeSpotlight();
        } else {
          openSpotlight();
        }
        return false;
      }
    };

    // Use capture phase to intercept before browser handles it
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [openSpotlight, closeSpotlight]);

  // App registry with icons and titles
  const appRegistry: Record<string, { icon: ReactNode; title: string }> = {
    notes: {
      icon: <FileText className="w-6 h-6 stroke-current" />,
      title: "Notes",
    },
    files: {
      icon: <FolderOpen className="w-6 h-6 stroke-current" />,
      title: "Files",
    },
    settings: {
      icon: <Settings className="w-6 h-6 stroke-current" />,
      title: "Settings",
    },
    camera: {
      icon: <Camera className="w-6 h-6 stroke-current" />,
      title: "Camera",
    },
    calendar: {
      icon: <Calendar className="w-6 h-6 stroke-current" />,
      title: "Calendar",
    },
    chat: {
      icon: <MessageSquare className="w-6 h-6 stroke-current" />,
      title: "Chat",
    },
    creator: {
      icon: <Sparkles className="w-6 h-6 stroke-current" />,
      title: "Creator",
    },
    browser: {
      icon: <Globe className="w-6 h-6 stroke-current" />,
      title: "Browser",
    },
    terminal: {
      icon: <Terminal className="w-6 h-6 stroke-current" />,
      title: "Terminal",
    },
  };

  // App definitions for start menu
  const apps: AppDefinition[] = [
    {
      id: "notes",
      name: "Notes",
      description: "Create and edit text notes",
      icon: <FileText className="w-12 h-12 stroke-current text-primary" />,
      onLaunch: () =>
        openWindow("notes-1", "Notes", <NotesApp />, {
          width: 800,
          height: 600,
        }),
    },
    {
      id: "files",
      name: "Files",
      description: "Browse your virtual filesystem",
      icon: <FolderOpen className="w-12 h-12 stroke-current text-primary" />,
      onLaunch: () =>
        openWindow("files-1", "Files", <FilesApp />, {
          width: 900,
          height: 600,
        }),
    },
    {
      id: "settings",
      name: "Settings",
      description: "Configure system preferences",
      icon: <Settings className="w-12 h-12 stroke-current text-primary" />,
      onLaunch: () => openWindow("settings-1", "Settings", <SettingsApp />),
    },
    {
      id: "camera",
      name: "Camera",
      description: "Take photos with your webcam",
      icon: <Camera className="w-12 h-12 stroke-current text-primary" />,
      onLaunch: () =>
        openWindow("camera-1", "Camera", <CameraApp />, {
          width: 900,
          height: 700,
        }),
    },
    {
      id: "calendar",
      name: "Calendar",
      description: "View and manage your calendar",
      icon: <Calendar className="w-12 h-12 stroke-current text-primary" />,
      onLaunch: () =>
        openWindow("calendar-1", "Calendar", <CalendarApp />, {
          width: 800,
          height: 600,
        }),
    },
    {
      id: "chat",
      name: "Chat",
      description: "Chat with AI assistant",
      icon: <MessageSquare className="w-12 h-12 stroke-current text-primary" />,
      onLaunch: () =>
        openWindow("chat-1", "Chat", <ChatApp />, { width: 1000, height: 700 }),
    },
    {
      id: "creator",
      name: "Creator",
      description: "Create apps by describing them in natural language",
      icon: <Sparkles className="w-12 h-12 stroke-current text-primary" />,
      onLaunch: () =>
        openWindow("creator-1", "Creator", <CreatorApp />, {
          width: 1000,
          height: 700,
        }),
    },
    {
      id: "browser",
      name: "Browser",
      description: "Browse the web",
      icon: <Globe className="w-12 h-12 stroke-current text-primary" />,
      onLaunch: () =>
        openWindow("browser-1", "Browser", <BrowserApp />, {
          width: 1200,
          height: 800,
        }),
    },
    {
      id: "terminal",
      name: "Terminal",
      description: "Command line terminal",
      icon: <Terminal className="w-12 h-12 stroke-current text-primary" />,
      onLaunch: () =>
        openWindow("terminal-1", "Terminal", <TerminalApp />, {
          width: 900,
          height: 600,
        }),
    },
  ];

  // Desktop icons
  const desktopIcons: DesktopIcon[] = [
    {
      id: "notes",
      label: "Notes",
      icon: <FileText className="w-12 h-12 stroke-current" />,
      onLaunch: () =>
        openWindow("notes-1", "Notes", <NotesApp />, {
          width: 800,
          height: 600,
        }),
    },
    {
      id: "files",
      label: "Files",
      icon: <FolderOpen className="w-12 h-12 stroke-current" />,
      onLaunch: () =>
        openWindow("files-1", "Files", <FilesApp />, {
          width: 900,
          height: 600,
        }),
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-12 h-12 stroke-current" />,
      onLaunch: () => openWindow("settings-1", "Settings", <SettingsApp />),
    },
    {
      id: "camera",
      label: "Camera",
      icon: <Camera className="w-12 h-12 stroke-current" />,
      onLaunch: () =>
        openWindow("camera-1", "Camera", <CameraApp />, {
          width: 900,
          height: 700,
        }),
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: <Calendar className="w-12 h-12 stroke-current" />,
      onLaunch: () =>
        openWindow("calendar-1", "Calendar", <CalendarApp />, {
          width: 800,
          height: 600,
        }),
    },
    {
      id: "chat",
      label: "Chat",
      icon: <MessageSquare className="w-12 h-12 stroke-current" />,
      onLaunch: () =>
        openWindow("chat-1", "Chat", <ChatApp />, { width: 1000, height: 700 }),
    },
    {
      id: "creator",
      label: "Creator",
      icon: <Sparkles className="w-12 h-12 stroke-current" />,
      onLaunch: () =>
        openWindow("creator-1", "Creator", <CreatorApp />, {
          width: 1000,
          height: 700,
        }),
    },
    {
      id: "browser",
      label: "Browser",
      icon: <Globe className="w-12 h-12 stroke-current" />,
      onLaunch: () =>
        openWindow("browser-1", "Browser", <BrowserApp />, {
          width: 1200,
          height: 800,
        }),
    },
    {
      id: "terminal",
      label: "Terminal",
      icon: <Terminal className="w-12 h-12 stroke-current" />,
      onLaunch: () =>
        openWindow("terminal-1", "Terminal", <TerminalApp />, {
          width: 900,
          height: 600,
        }),
    },
  ];

  // Recalculate wallpaper style when wallpaper or theme changes
  const wallpaperStyle = useMemo(() => {
    return getWallpaperStyle(wallpaper, theme);
  }, [wallpaper, theme]);

  return (
    <div className="fixed inset-0 overflow-hidden" style={wallpaperStyle}>
      {/* Desktop */}
      <Desktop
        icons={desktopIcons}
        widgets={[
          <WeatherWidget key="weather" />,
          <CalendarWidget
            key="calendar"
            onDateClick={() => {
              // Open Calendar app when date is clicked
              openWindow("calendar-1", "Calendar", <CalendarApp />, {
                width: 800,
                height: 600,
              });
            }}
          />,
        ]}
      />

      {/* Windows */}
      <AnimatePresence>
        {windows.map((window) => (
          <Window key={window.id} window={window} />
        ))}
      </AnimatePresence>

      {/* Start Menu */}
      <StartMenu
        isOpen={startMenuOpen}
        onClose={() => setStartMenuOpen(false)}
        apps={apps}
      />

      {/* Spotlight */}
      <Spotlight apps={apps} />

      {/* Dock */}
      <Dock
        onStartMenuToggle={() => setStartMenuOpen(!startMenuOpen)}
        appRegistry={appRegistry}
        apps={apps.map((app) => ({
          id: app.id,
          name: app.name,
          onLaunch: app.onLaunch,
        }))}
      />

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}
