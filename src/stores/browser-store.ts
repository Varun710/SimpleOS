import { create } from "zustand";
import localforage from "localforage";
import { nanoid } from "nanoid";

export interface BrowserTab {
  id: string;
  url: string;
  history: string[];
  historyIndex: number;
}

interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string | null;
  
  // Actions
  setUrl: (id: string, url: string) => void;
  back: (id: string) => void;
  forward: (id: string) => void;
  refresh: (id: string) => void;
  newTab: () => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  
  // Persistence
  loadTabs: () => Promise<void>;
  saveTabs: () => Promise<void>;
}

const STORAGE_KEY_TABS = "browser-os-browser-tabs";
const STORAGE_KEY_ACTIVE_TAB = "browser-os-browser-active-tab";

const createBlankTab = (): BrowserTab => ({
  id: nanoid(),
  url: "",
  history: [""],
  historyIndex: 0,
});

export const useBrowserStore = create<BrowserState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  setUrl: (id: string, url: string) => {
    set((state) => {
      const tab = state.tabs.find((t) => t.id === id);
      if (!tab) return state;

      const newHistory = [...tab.history.slice(0, tab.historyIndex + 1), url];
      const newHistoryIndex = newHistory.length - 1;

      const updatedTabs = state.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              url,
              history: newHistory,
              historyIndex: newHistoryIndex,
            }
          : t
      );

      return { tabs: updatedTabs };
    });
    
    get().saveTabs();
  },

  back: (id: string) => {
    set((state) => {
      const tab = state.tabs.find((t) => t.id === id);
      if (!tab || tab.historyIndex === 0) return state;

      const newHistoryIndex = tab.historyIndex - 1;
      const newUrl = tab.history[newHistoryIndex];

      const updatedTabs = state.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              url: newUrl,
              historyIndex: newHistoryIndex,
            }
          : t
      );

      return { tabs: updatedTabs };
    });
    
    get().saveTabs();
  },

  forward: (id: string) => {
    set((state) => {
      const tab = state.tabs.find((t) => t.id === id);
      if (!tab || tab.historyIndex >= tab.history.length - 1) return state;

      const newHistoryIndex = tab.historyIndex + 1;
      const newUrl = tab.history[newHistoryIndex];

      const updatedTabs = state.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              url: newUrl,
              historyIndex: newHistoryIndex,
            }
          : t
      );

      return { tabs: updatedTabs };
    });
    
    get().saveTabs();
  },

  refresh: () => {
    // Refresh is handled by re-assigning iframe src in the component
    // This action exists for consistency but doesn't need to modify state
    get().saveTabs();
  },

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

  loadTabs: async () => {
    try {
      const tabs = await localforage.getItem<BrowserTab[]>(STORAGE_KEY_TABS) || [];
      const activeTabId = await localforage.getItem<string | null>(STORAGE_KEY_ACTIVE_TAB) || null;

      // If no tabs exist, create a default blank tab
      if (tabs.length === 0) {
        const defaultTab = createBlankTab();
        set({
          tabs: [defaultTab],
          activeTabId: defaultTab.id,
        });
        await get().saveTabs();
        return;
      }

      // Ensure activeTabId is valid
      const validActiveTabId = tabs.find((t) => t.id === activeTabId)
        ? activeTabId
        : tabs[0].id;

      set({
        tabs,
        activeTabId: validActiveTabId,
      });
    } catch (error) {
      console.error("Failed to load browser tabs:", error);
      // Create default tab on error
      const defaultTab = createBlankTab();
      set({
        tabs: [defaultTab],
        activeTabId: defaultTab.id,
      });
    }
  },

  saveTabs: async () => {
    try {
      const { tabs, activeTabId } = get();
      await localforage.setItem(STORAGE_KEY_TABS, tabs);
      await localforage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTabId);
    } catch (error) {
      console.error("Failed to save browser tabs:", error);
    }
  },
}));

