import { create } from "zustand";
import localforage from "localforage";
import { nanoid } from "nanoid";

export interface TerminalTab {
  id: string;
  sessionId: string;
  cwd: string;
  history: Array<{ command: string; output: string; timestamp: Date }>;
  commandHistory: string[]; // For arrow key navigation
  historyIndex: number; // Current position in command history
}

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  settings: {
    fontSize: number;
    theme: "light" | "dark";
    cursorStyle: "block" | "underline" | "bar";
    scrollback: number;
  };

  // Actions
  newTab: () => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabHistory: (tabId: string, command: string, output: string) => void;
  updateCwd: (tabId: string, cwd: string) => void;
  addCommandToHistory: (tabId: string, command: string) => void;
  navigateHistory: (tabId: string, direction: "up" | "down") => string | null;
  clearTabHistory: (tabId: string) => void;
  updateSettings: (settings: Partial<TerminalState["settings"]>) => void;

  // Persistence
  loadTabs: () => Promise<void>;
  saveTabs: () => Promise<void>;
}

const STORAGE_KEY_TABS = "browser-os-terminal-tabs";
const STORAGE_KEY_ACTIVE_TAB = "browser-os-terminal-active-tab";
const STORAGE_KEY_SETTINGS = "browser-os-terminal-settings";

const createBlankTab = (): TerminalTab => ({
  id: nanoid(),
  sessionId: nanoid(),
  cwd: "",
  history: [],
  commandHistory: [],
  historyIndex: -1,
});

const defaultSettings = {
  fontSize: 14,
  theme: "dark" as const,
  cursorStyle: "block" as const,
  scrollback: 1000,
};

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  settings: defaultSettings,

  newTab: () => {
    const newTab = createBlankTab();
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
    get().saveTabs();
    return newTab.id;
  },

  closeTab: (id: string) => {
    set((state) => {
      if (state.tabs.length <= 1) {
        // Don't allow closing the last tab
        return state;
      }

      const newTabs = state.tabs.filter((t) => t.id !== id);
      const newActiveTabId =
        state.activeTabId === id
          ? newTabs.length > 0
            ? newTabs[0].id
            : null
          : state.activeTabId;

      return {
        tabs: newTabs,
        activeTabId: newActiveTabId,
      };
    });
    get().saveTabs();
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id });
    localforage.setItem(STORAGE_KEY_ACTIVE_TAB, id);
  },

  updateTabHistory: (tabId: string, command: string, output: string) => {
    set((state) => {
      const updatedTabs = state.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              history: [
                ...tab.history,
                { command, output, timestamp: new Date() },
              ],
            }
          : tab
      );
      return { tabs: updatedTabs };
    });
    get().saveTabs();
  },

  updateCwd: (tabId: string, cwd: string) => {
    set((state) => {
      const updatedTabs = state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, cwd } : tab
      );
      return { tabs: updatedTabs };
    });
    get().saveTabs();
  },

  addCommandToHistory: (tabId: string, command: string) => {
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      if (!tab) return state;

      // Don't add duplicate consecutive commands
      const lastCommand = tab.commandHistory[tab.commandHistory.length - 1];
      if (lastCommand === command) {
        return state;
      }

      const updatedTabs = state.tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              commandHistory: [...t.commandHistory, command],
              historyIndex: -1,
            }
          : t
      );
      return { tabs: updatedTabs };
    });
    get().saveTabs();
  },

  navigateHistory: (tabId: string, direction: "up" | "down"): string | null => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === tabId);
    if (!tab || tab.commandHistory.length === 0) return null;

    let newIndex = tab.historyIndex;

    if (direction === "up") {
      if (newIndex === -1) {
        newIndex = tab.commandHistory.length - 1;
      } else if (newIndex > 0) {
        newIndex = newIndex - 1;
      }
    } else {
      // down
      if (newIndex === -1) {
        return null;
      } else if (newIndex < tab.commandHistory.length - 1) {
        newIndex = newIndex + 1;
      } else {
        newIndex = -1;
      }
    }

    set((state) => {
      const updatedTabs = state.tabs.map((t) =>
        t.id === tabId ? { ...t, historyIndex: newIndex } : t
      );
      return { tabs: updatedTabs };
    });

    if (newIndex === -1) return null;
    return tab.commandHistory[newIndex];
  },

  clearTabHistory: (tabId: string) => {
    set((state) => {
      const updatedTabs = state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, history: [] } : tab
      );
      return { tabs: updatedTabs };
    });
    get().saveTabs();
  },

  updateSettings: (newSettings: Partial<TerminalState["settings"]>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
    localforage.setItem(STORAGE_KEY_SETTINGS, get().settings);
  },

  loadTabs: async () => {
    try {
      const tabs = await localforage.getItem<TerminalTab[]>(STORAGE_KEY_TABS);
      const activeTabId =
        (await localforage.getItem<string | null>(STORAGE_KEY_ACTIVE_TAB)) ||
        null;
      const settings =
        (await localforage.getItem<TerminalState["settings"]>(
          STORAGE_KEY_SETTINGS
        )) || defaultSettings;

      // Restore Date objects from serialized format
      const restoredTabs =
        tabs?.map((tab) => ({
          ...tab,
          history: tab.history.map((h) => ({
            ...h,
            timestamp: new Date(h.timestamp),
          })),
        })) || [];

      // If no tabs exist, create a default blank tab
      if (restoredTabs.length === 0) {
        const defaultTab = createBlankTab();
        set({
          tabs: [defaultTab],
          activeTabId: defaultTab.id,
          settings,
        });
        await get().saveTabs();
        return;
      }

      // Ensure activeTabId is valid
      const validActiveTabId = restoredTabs.find((t) => t.id === activeTabId)
        ? activeTabId
        : restoredTabs[0].id;

      set({
        tabs: restoredTabs,
        activeTabId: validActiveTabId,
        settings,
      });
    } catch (error) {
      console.error("Failed to load terminal tabs:", error);
      // Create default tab on error
      const defaultTab = createBlankTab();
      set({
        tabs: [defaultTab],
        activeTabId: defaultTab.id,
        settings: defaultSettings,
      });
    }
  },

  saveTabs: async () => {
    try {
      const { tabs, activeTabId, settings } = get();
      await localforage.setItem(STORAGE_KEY_TABS, tabs);
      await localforage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTabId);
      await localforage.setItem(STORAGE_KEY_SETTINGS, settings);
    } catch (error) {
      console.error("Failed to save terminal tabs:", error);
    }
  },
}));

