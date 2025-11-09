import { create } from "zustand";
import localforage from "localforage";
import { nanoid } from "nanoid";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD)
  timeFrom?: string; // Start time string (HH:MM) - optional for all-day events
  timeTo?: string; // End time string (HH:MM) - optional for all-day events
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

interface CalendarStore {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addEvent: (event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => string;
  updateEvent: (id: string, event: Partial<Omit<CalendarEvent, "id" | "createdAt">>) => void;
  deleteEvent: (id: string) => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
  getEventsForMonth: (year: number, month: number) => CalendarEvent[];
  
  // Persistence
  loadEvents: () => Promise<void>;
  saveEvents: () => Promise<void>;
}

const STORAGE_KEY_EVENTS = "browser-os-calendar-events";

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,

  addEvent: (event) => {
    const now = Date.now();
    const newEvent: CalendarEvent = {
      ...event,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };
    
    set((state) => ({
      events: [...state.events, newEvent].sort((a, b) => {
        // Sort by date, then by start time
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        const timeA = a.timeFrom || "23:59";
        const timeB = b.timeFrom || "23:59";
        return timeA.localeCompare(timeB);
      }),
    }));
    
    get().saveEvents();
    return newEvent.id;
  },

  updateEvent: (id: string, updates) => {
    set((state) => ({
      events: state.events.map((event) =>
        event.id === id
          ? { ...event, ...updates, updatedAt: Date.now() }
          : event
      ).sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        const timeA = a.timeFrom || "23:59";
        const timeB = b.timeFrom || "23:59";
        return timeA.localeCompare(timeB);
      }),
    }));
    
    get().saveEvents();
  },

  deleteEvent: (id: string) => {
    set((state) => ({
      events: state.events.filter((event) => event.id !== id),
    }));
    
    get().saveEvents();
  },

  getEventsForDate: (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return get().events.filter((event) => event.date === dateStr);
  },

  getEventsForMonth: (year: number, month: number) => {
    return get().events.filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });
  },

  loadEvents: async () => {
    try {
      set({ isLoading: true });
      const events = await localforage.getItem<any[]>(STORAGE_KEY_EVENTS) || [];
      // Migrate old events with `time` field to `timeFrom`
      const migratedEvents = events.map((event) => {
        if (event.time && !event.timeFrom) {
          return {
            ...event,
            timeFrom: event.time,
            timeTo: undefined,
          };
        }
        return event;
      });
      set({ events: migratedEvents, isLoading: false });
      // Save migrated events if migration occurred
      if (events.length > 0 && events.some((e) => e.time && !e.timeFrom)) {
        await localforage.setItem(STORAGE_KEY_EVENTS, migratedEvents);
      }
    } catch (error) {
      console.error("Failed to load calendar events:", error);
      set({ error: "Failed to load calendar events", isLoading: false });
    }
  },

  saveEvents: async () => {
    try {
      const { events } = get();
      await localforage.setItem(STORAGE_KEY_EVENTS, events);
    } catch (error) {
      console.error("Failed to save calendar events:", error);
      set({ error: "Failed to save calendar events" });
    }
  },
}));

