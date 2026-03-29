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
  setActiveTimeframe: (activeTimeframe) => set({ activeTimeframe }),
}));

export const selectActivePair = (state: DashboardState) => state.activePair;
export const selectActiveTimeframe = (state: DashboardState) => state.activeTimeframe;
