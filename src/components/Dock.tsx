import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useWindowManager } from "@/os/window-manager";
import { os } from "@/os/os-core";
import { Menu, Sun, Moon } from "lucide-react";

interface DockProps {
  onStartMenuToggle: () => void;
  appRegistry: Record<string, { icon: ReactNode; title: string }>;
  apps: Array<{
    id: string;
    name: string;
    onLaunch: () => void;
  }>;
}

export function Dock({ onStartMenuToggle, appRegistry, apps }: DockProps) {
  const { windows, restoreWindow, bringToFront } = useWindowManager();
  const [time, setTime] = useState(new Date());
  const [theme, setTheme] = useState<"light" | "dark">(os.settings.getTheme());
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);
  const [isDockVisible, setIsDockVisible] = useState(false);
  const [isDockHovered, setIsDockHovered] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleThemeChange = (newTheme: "light" | "dark") => {
      setTheme(newTheme);
    };
    os.bus.on("theme-changed", handleThemeChange);
    return () => os.bus.off("theme-changed", handleThemeChange);
  }, []);

  // Handle dock visibility based on mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Clear any pending hide timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      const threshold = 50; // pixels from bottom to trigger dock
      const distanceFromBottom = window.innerHeight - e.clientY;
      
      // Show dock if mouse is near bottom or hovering over dock
      if (distanceFromBottom < threshold || isDockHovered) {
        setIsDockVisible(true);
      } else {
        // Add a small delay before hiding to prevent flickering
        hideTimeoutRef.current = setTimeout(() => {
          if (!isDockHovered) {
            setIsDockVisible(false);
          }
          hideTimeoutRef.current = null;
        }, 200);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [isDockHovered]);

  // Keep dock visible when hovering over it
  useEffect(() => {
    if (isDockHovered) {
      setIsDockVisible(true);
    }
  }, [isDockHovered]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    os.settings.setTheme(newTheme);
  };

  const handleAppClick = (appId: string, onLaunch: () => void) => {
    // Check if app is already open
    const existingWindow = windows.find((w) => w.id.startsWith(appId));
    
    if (existingWindow) {
      // Focus existing window
      if (existingWindow.minimized) {
        restoreWindow(existingWindow.id);
      } else {
        bringToFront(existingWindow.id);
      }
    } else {
      // Launch new window
      onLaunch();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get all apps (both running and available)
  const getDockApps = () => {
    const dockApps: Array<{
      id: string;
      name: string;
      icon: ReactNode;
      isRunning: boolean;
      windowId?: string;
      isMinimized?: boolean;
      onLaunch: () => void;
    }> = [];

    // Add all available apps
    apps.forEach((app) => {
      const appInfo = appRegistry[app.id];
      const runningWindow = windows.find((w) => w.id.startsWith(app.id));
      
      dockApps.push({
        id: app.id,
        name: app.name,
        icon: appInfo?.icon || <div />,
        isRunning: !!runningWindow,
        windowId: runningWindow?.id,
        isMinimized: runningWindow?.minimized,
        onLaunch: app.onLaunch,
      });
    });

    return dockApps;
  };

  const dockApps = getDockApps();

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-4 pointer-events-none z-[9999]">
      <motion.div
        initial={false}
        animate={{ 
          y: isDockVisible ? 0 : 100,
          opacity: isDockVisible ? 1 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        onMouseEnter={() => setIsDockHovered(true)}
        onMouseLeave={() => setIsDockHovered(false)}
        className="flex items-end gap-2 px-4 py-3 bg-background/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border pointer-events-auto"
      >
        {/* Start Menu Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStartMenuToggle}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground mb-1"
          aria-label="Start Menu"
        >
          <Menu className="w-6 h-6 stroke-current" />
        </motion.button>

        {/* Separator */}
        <div className="w-px h-10 bg-border mb-1" />

        {/* Dock Apps */}
        <div className="flex items-end gap-1">
          {dockApps.map((app) => {
            const isHovered = hoveredApp === app.id;
            const scale = isHovered ? 1.3 : 1.0;
            
            return (
              <motion.button
                key={app.id}
                onMouseEnter={() => setHoveredApp(app.id)}
                onMouseLeave={() => setHoveredApp(null)}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAppClick(app.id, app.onLaunch)}
                className={`
                  relative p-2 rounded-lg transition-all text-foreground
                  ${app.isRunning && !app.isMinimized ? "bg-primary/10" : ""}
                  ${isHovered ? "z-10" : ""}
                `}
                style={{
                  transformOrigin: "bottom center",
                }}
                animate={{
                  scale,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 17,
                }}
                aria-label={app.name}
              >
                <div className="w-10 h-10 flex items-center justify-center text-foreground [&>svg]:stroke-current [&>svg]:w-6 [&>svg]:h-6">
                  {app.icon}
                </div>
                {app.isRunning && !app.isMinimized && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Separator */}
        <div className="w-px h-10 bg-border mb-1" />

        {/* Theme Toggle and Clock - Centered */}
        <div className="flex items-center gap-2 self-center">
          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5 stroke-current" />
            ) : (
              <Sun className="w-5 h-5 stroke-current" />
            )}
          </motion.button>

          {/* Clock */}
          <div className="px-3 py-1 text-sm font-medium text-foreground">
            {formatTime(time)}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

