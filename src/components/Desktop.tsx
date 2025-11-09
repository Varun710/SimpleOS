import { useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";

export interface DesktopIcon {
  id: string;
  label: string;
  icon: ReactNode;
  onLaunch: () => void;
}

interface DesktopProps {
  icons: DesktopIcon[];
  widgets?: ReactNode[];
}

export function Desktop({ icons, widgets }: DesktopProps) {
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [lastClickTime, setLastClickTime] = useState<number>(0);

  const handleIconClick = (icon: DesktopIcon) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;

    if (selectedIcon === icon.id && timeSinceLastClick < 500) {
      // Double click detected
      icon.onLaunch();
      setSelectedIcon(null);
    } else {
      // Single click
      setSelectedIcon(icon.id);
    }

    setLastClickTime(now);
  };

  return (
    <>
      {/* Widgets */}
      {widgets && widgets.length > 0 && (
        <div className="absolute top-4 right-4 flex flex-col gap-4 z-10 pointer-events-none">
          {widgets.map((widget, index) => (
            <div key={index} className="pointer-events-auto">
              {widget}
            </div>
          ))}
        </div>
      )}

      {/* Desktop Icons */}
      <div
        className="absolute inset-0 p-8 grid grid-cols-[repeat(auto-fill,100px)] grid-rows-[repeat(auto-fill,100px)] gap-4 content-start"
        onClick={() => setSelectedIcon(null)}
      >
        {icons.map((icon) => (
        <motion.div
          key={icon.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            flex flex-col items-center justify-center gap-2 p-3 rounded-lg
            cursor-pointer select-none transition-colors
            ${
              selectedIcon === icon.id
                ? "bg-primary/20 backdrop-blur-sm"
                : "hover:bg-primary/10"
            }
          `}
          onClick={(e) => {
            e.stopPropagation();
            handleIconClick(icon);
          }}
        >
          <div className="w-12 h-12 flex items-center justify-center drop-shadow-lg text-foreground [&>svg]:stroke-current">
            {icon.icon}
          </div>
          <span className="text-xs text-foreground text-center font-medium px-2 py-1 rounded bg-background/80 backdrop-blur-sm shadow-lg border border-border/50">
            {icon.label}
          </span>
        </motion.div>
        ))}
      </div>
    </>
  );
}

