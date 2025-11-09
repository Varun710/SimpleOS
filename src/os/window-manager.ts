import { create } from "zustand";
import type { ReactNode } from "react";

export interface WindowState {
  id: string;
  title: string;
  component: ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  prevX?: number;
  prevY?: number;
  prevWidth?: number;
  prevHeight?: number;
}

interface WindowManagerState {
  windows: WindowState[];
  nextZIndex: number;
  openWindow: (
    id: string,
    title: string,
    component: ReactNode,
    options?: Partial<Omit<WindowState, "id" | "title" | "component">>
  ) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  bringToFront: (id: string) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  updateSize: (id: string, width: number, height: number) => void;
  getWindow: (id: string) => WindowState | undefined;
}

const STORAGE_KEY = "browser-os-windows";

const saveToStorage = (windows: WindowState[]) => {
  try {
    const serialized = windows.map((w) => ({
      ...w,
      component: null, // Don't serialize component
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (e) {
    console.error("Failed to save windows:", e);
  }
};

export const useWindowManager = create<WindowManagerState>((set, get) => ({
  windows: [],
  nextZIndex: 1000,

  openWindow: (id, title, component, options = {}) => {
    const existing = get().windows.find((w) => w.id === id);
    if (existing) {
      // If window exists, just bring it to front and restore if minimized
      if (existing.minimized) {
        get().restoreWindow(id);
      } else {
        get().bringToFront(id);
      }
      return;
    }

    const nextZIndex = get().nextZIndex;
    const newWindow: WindowState = {
      id,
      title,
      component,
      x: options.x ?? 100 + (get().windows.length * 30),
      y: options.y ?? 100 + (get().windows.length * 30),
      width: options.width ?? 600,
      height: options.height ?? 400,
      minimized: false,
      maximized: false,
      zIndex: nextZIndex,
    };

    set((state) => {
      const newWindows = [...state.windows, newWindow];
      saveToStorage(newWindows);
      return {
        windows: newWindows,
        nextZIndex: nextZIndex + 1,
      };
    });
  },

  closeWindow: (id) => {
    set((state) => {
      const newWindows = state.windows.filter((w) => w.id !== id);
      saveToStorage(newWindows);
      return { windows: newWindows };
    });
  },

  minimizeWindow: (id) => {
    set((state) => {
      const newWindows = state.windows.map((w) =>
        w.id === id ? { ...w, minimized: true } : w
      );
      saveToStorage(newWindows);
      return { windows: newWindows };
    });
  },

  restoreWindow: (id) => {
    set((state) => {
      const nextZIndex = state.nextZIndex;
      const newWindows = state.windows.map((w) =>
        w.id === id ? { ...w, minimized: false, zIndex: nextZIndex } : w
      );
      saveToStorage(newWindows);
      return {
        windows: newWindows,
        nextZIndex: nextZIndex + 1,
      };
    });
  },

  toggleMaximize: (id) => {
    set((state) => {
      const targetWindow = state.windows.find((w) => w.id === id);
      if (!targetWindow) return state;

      const newWindows = state.windows.map((w) => {
        if (w.id !== id) return w;

        if (w.maximized) {
          // Restore to previous size
          return {
            ...w,
            maximized: false,
            x: w.prevX ?? 100,
            y: w.prevY ?? 100,
            width: w.prevWidth ?? 600,
            height: w.prevHeight ?? 400,
            prevX: undefined,
            prevY: undefined,
            prevWidth: undefined,
            prevHeight: undefined,
          };
        } else {
          // Maximize - fill entire screen
          const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
          const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
          
          return {
            ...w,
            maximized: true,
            prevX: w.x,
            prevY: w.y,
            prevWidth: w.width,
            prevHeight: w.height,
            x: 0,
            y: 0,
            width: viewportWidth,
            height: viewportHeight,
          };
        }
      });

      saveToStorage(newWindows);
      return { windows: newWindows };
    });
  },

  bringToFront: (id) => {
    set((state) => {
      const nextZIndex = state.nextZIndex;
      const newWindows = state.windows.map((w) =>
        w.id === id ? { ...w, zIndex: nextZIndex } : w
      );
      saveToStorage(newWindows);
      return {
        windows: newWindows,
        nextZIndex: nextZIndex + 1,
      };
    });
  },

  updatePosition: (id, x, y) => {
    set((state) => {
      const newWindows = state.windows.map((w) =>
        w.id === id ? { ...w, x, y } : w
      );
      saveToStorage(newWindows);
      return { windows: newWindows };
    });
  },

  updateSize: (id, width, height) => {
    set((state) => {
      const newWindows = state.windows.map((w) =>
        w.id === id ? { ...w, width, height } : w
      );
      saveToStorage(newWindows);
      return { windows: newWindows };
    });
  },

  getWindow: (id) => {
    return get().windows.find((w) => w.id === id);
  },
}));

