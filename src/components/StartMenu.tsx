import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

export interface AppDefinition {
  id: string;
  name: string;
  icon: ReactNode;
  description: string;
  onLaunch: () => void;
}

interface StartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  apps: AppDefinition[];
}

export function StartMenu({ isOpen, onClose, apps }: StartMenuProps) {
  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed left-1/2 bottom-20 transform -translate-x-1/2 w-[600px] max-h-[500px] bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border overflow-hidden z-[9999]"
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Applications</h2>

              <div className="grid grid-cols-3 gap-4">
                {apps.map((app) => (
                  <motion.button
                    key={app.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      app.onLaunch();
                      onClose();
                    }}
                    className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-muted transition-colors text-left group"
                  >
                    <div className="w-12 h-12 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      {app.icon}
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-sm">{app.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {app.description}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

