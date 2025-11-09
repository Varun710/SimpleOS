import { motion } from "framer-motion";
import { useWindowManager } from "@/os/window-manager";
import { Menu, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { os } from "@/os/os-core";

interface TaskbarProps {
  onStartMenuToggle: () => void;
  appRegistry: Record<string, { icon: ReactNode; title: string }>;
}

export function Taskbar({ onStartMenuToggle, appRegistry }: TaskbarProps) {
  const { windows, restoreWindow, bringToFront } = useWindowManager();
  const [time, setTime] = useState(new Date());
  const [theme, setTheme] = useState<"light" | "dark">(os.settings.getTheme());

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

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    os.settings.setTheme(newTheme);
  };

  const handleWindowClick = (windowId: string, isMinimized: boolean) => {
    if (isMinimized) {
      restoreWindow(windowId);
    } else {
      bringToFront(windowId);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-4 pointer-events-none z-[9999]">
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="flex items-center gap-2 px-4 py-3 bg-background/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border pointer-events-auto"
      >
        {/* Start Menu Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStartMenuToggle}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
          aria-label="Start Menu"
        >
          <Menu className="w-6 h-6 stroke-current" />
        </motion.button>

        {/* Separator */}
        <div className="w-px h-8 bg-border" />

        {/* Running Apps */}
        {windows.map((window) => {
          const appInfo = appRegistry[window.id.split("-")[0]];
          return (
            <motion.button
              key={window.id}
              whileHover={{ scale: 1.1, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleWindowClick(window.id, window.minimized)}
              className={`
                p-2 rounded-lg transition-all relative text-foreground
                ${
                  window.minimized
                    ? "opacity-50"
                    : "bg-primary/10 ring-2 ring-primary/20"
                }
              `}
              aria-label={window.title}
            >
              <div className="w-6 h-6 flex items-center justify-center text-foreground [&>svg]:stroke-current">
                {appInfo?.icon}
              </div>
              {!window.minimized && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </motion.button>
          );
        })}

        {/* Separator */}
        <div className="w-px h-8 bg-border" />

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
      </motion.div>
    </div>
  );
}

