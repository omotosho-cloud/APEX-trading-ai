import { create } from "zustand";

type DashboardState = {
  activePair: string;
  activeTimeframe: string;
  setActivePair: (pair: string) => void;
  setActiveTimeframe: (tf: string) => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  activePair: "EURUSD",
  activeTimeframe: "H4",
  setActivePair: (activePair) => set({ activePair }),
  setActiveTimeframe: () => set({ activeTimeframe: "H4" }), // locked to H4
}));

export const selectActivePair = (state: DashboardState) => state.activePair;
export const selectActiveTimeframe = (state: DashboardState) => state.activeTimeframe;
