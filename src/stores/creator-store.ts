import { create } from "zustand";
import localforage from "localforage";
import { nanoid } from "nanoid";

export interface CreatedApp {
  id: string;
  name: string;
  prompt: string;
  html: string;
  css: string;
  js: string;
  createdAt: number;
}

interface CreatorStore {
  createdApps: CreatedApp[];
  selectedAppId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addCreatedApp: (name: string, prompt: string, html: string, css: string, js: string) => string;
  deleteCreatedApp: (appId: string) => void;
  selectCreatedApp: (appId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Persistence
  loadCreatedApps: () => Promise<void>;
  saveCreatedApps: () => Promise<void>;
}

const STORAGE_KEY_APPS = "browser-os-created-apps";
const STORAGE_KEY_SELECTED = "browser-os-selected-app-id";

export const useCreatorStore = create<CreatorStore>((set, get) => ({
  createdApps: [],
  selectedAppId: null,
  isLoading: false,
  error: null,

  addCreatedApp: (name: string, prompt: string, html: string, css: string, js: string) => {
    const appId = nanoid();
    const now = Date.now();
    const newApp: CreatedApp = {
      id: appId,
      name,
      prompt,
      html,
      css,
      js,
      createdAt: now,
    };
    
    set((state) => ({
      createdApps: [newApp, ...state.createdApps],
      selectedAppId: appId,
    }));
    
    get().saveCreatedApps();
    return appId;
  },

  deleteCreatedApp: (appId: string) => {
    set((state) => {
      const newApps = state.createdApps.filter((app) => app.id !== appId);
      const newSelectedAppId = state.selectedAppId === appId 
        ? (newApps.length > 0 ? newApps[0].id : null)
        : state.selectedAppId;
      
      return {
        createdApps: newApps,
        selectedAppId: newSelectedAppId,
      };
    });
    
    get().saveCreatedApps();
  },

  selectCreatedApp: (appId: string | null) => {
    set({ selectedAppId: appId });
    localforage.setItem(STORAGE_KEY_SELECTED, appId);
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  loadCreatedApps: async () => {
    try {
      const apps = await localforage.getItem<any[]>(STORAGE_KEY_APPS) || [];
      const selectedAppId = await localforage.getItem<string | null>(STORAGE_KEY_SELECTED) || null;
      
      // Migrate old format (with 'plan') to new format (with 'html', 'css', 'js')
      const migratedApps: CreatedApp[] = apps.map((app: any) => {
        // If it's the old format, skip it (or migrate if needed)
        if ('plan' in app && !('html' in app)) {
          // Old format - skip these apps as they can't be displayed
          return null;
        }
        // Ensure all required fields exist
        if (!app.name || !app.html || !app.css || !app.js) {
          return null;
        }
        return app as CreatedApp;
      }).filter((app): app is CreatedApp => app !== null);
      
      // Sort apps by createdAt (newest first)
      const sortedApps = [...migratedApps].sort((a, b) => b.createdAt - a.createdAt);
      
      // If we migrated, save the cleaned data
      if (migratedApps.length !== apps.length) {
        await localforage.setItem(STORAGE_KEY_APPS, sortedApps);
      }
      
      set({
        createdApps: sortedApps,
        selectedAppId: sortedApps.find(app => app.id === selectedAppId) ? selectedAppId : null,
      });
    } catch (error) {
      console.error("Failed to load created apps:", error);
      set({ error: "Failed to load created apps" });
    }
  },

  saveCreatedApps: async () => {
    try {
      const { createdApps, selectedAppId } = get();
      await localforage.setItem(STORAGE_KEY_APPS, createdApps);
      await localforage.setItem(STORAGE_KEY_SELECTED, selectedAppId);
    } catch (error) {
      console.error("Failed to save created apps:", error);
      set({ error: "Failed to save created apps" });
    }
  },
}));

