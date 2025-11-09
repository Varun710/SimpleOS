import { create } from "zustand";

interface SpotlightState {
  isOpen: boolean;
  query: string;
  setQuery: (q: string) => void;
  open: () => void;
  close: () => void;
}

export const useSpotlightStore = create<SpotlightState>((set) => ({
  isOpen: false,
  query: "",
  setQuery: (q: string) => set({ query: q }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, query: "" }),
}));

