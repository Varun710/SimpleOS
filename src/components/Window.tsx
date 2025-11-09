import { motion, useDragControls } from "framer-motion";
import { useWindowManager } from "@/os/window-manager";
import type { WindowState } from "@/os/window-manager";
import { X, Minus, Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";

interface WindowProps {
  window: WindowState;
}

export function Window({ window: windowState }: WindowProps) {
  const { closeWindow, minimizeWindow, toggleMaximize, bringToFront, updatePosition, updateSize } =
    useWindowManager();
  const dragControls = useDragControls();
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Update viewport size when window becomes maximized
  useEffect(() => {
    if (windowState.maximized) {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      setViewportSize({ width: newWidth, height: newHeight });
      updateSize(windowState.id, newWidth, newHeight);
    }
  }, [windowState.maximized, windowState.id, updateSize]);

  // Handle window resize to keep maximized windows full screen
  useEffect(() => {
    if (!windowState.maximized) return;

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      setViewportSize({ width: newWidth, height: newHeight });
      updateSize(windowState.id, newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [windowState.maximized, windowState.id, updateSize]);

  const handleDragEnd = (_: any, info: any) => {
    const newX = windowState.x + info.offset.x;
    const newY = windowState.y + info.offset.y;
    
    // If maximized, allow negative positions to enable dragging anywhere
    // but clamp to reasonable bounds
    if (windowState.maximized) {
      updatePosition(windowState.id, newX, newY);
    } else {
      updatePosition(windowState.id, Math.max(0, newX), Math.max(0, newY));
    }
  };

  if (windowState.minimized) {
    return null;
  }

  return (
    <motion.div
      drag={true}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      dragConstraints={
        windowState.maximized
          ? false // No constraints when maximized - allow dragging anywhere
          : {
              left: 0,
              top: 0,
              right: window.innerWidth - windowState.width,
              bottom: window.innerHeight - windowState.height - 60,
            }
      }
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        left: windowState.maximized ? 0 : windowState.x,
        top: windowState.maximized ? 0 : windowState.y,
        width: windowState.maximized ? viewportSize.width : windowState.width,
        height: windowState.maximized ? viewportSize.height : windowState.height,
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed",
        zIndex: Math.min(windowState.zIndex, 9998), // Ensure dock (z-9999) stays on top
      }}
      className={`flex flex-col bg-background/95 shadow-2xl backdrop-blur-xl border border-border overflow-hidden ${
        windowState.maximized ? "rounded-none" : "rounded-xl"
      }`}
      onMouseDown={() => bringToFront(windowState.id)}
    >
      {/* Title Bar */}
      <div
        className={`flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border select-none cursor-move`}
        style={{ touchAction: "none" }}
        onPointerDown={(e) => dragControls.start(e)}
      >
        {/* Traffic light buttons - macOS style */}
        <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(windowState.id);
            }}
            className="w-3 h-3 rounded-full transition-all flex items-center justify-center group"
            style={{ backgroundColor: '#ff5f57' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ff3b30'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff5f57'}
            aria-label="Close"
          >
            <X className="w-2 h-2 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(windowState.id);
            }}
            className="w-3 h-3 rounded-full transition-all flex items-center justify-center group"
            style={{ backgroundColor: '#ffbd2e' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffaa00'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffbd2e'}
            aria-label="Minimize"
          >
            <Minus className="w-2 h-2 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximize(windowState.id);
            }}
            className="w-3 h-3 rounded-full transition-all flex items-center justify-center group"
            style={{ backgroundColor: '#28c840' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#20a034'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28c840'}
            aria-label="Maximize"
          >
            <Maximize2 className="w-2 h-2 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Window title */}
        <div className="absolute left-1/2 transform -translate-x-1/2 text-sm font-medium text-foreground">
          {windowState.title}
        </div>

        {/* Spacer for centering */}
        <div className="w-20" />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden bg-background">
        {windowState.component}
      </div>
    </motion.div>
  );
}

