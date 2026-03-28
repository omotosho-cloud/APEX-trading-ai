import { create } from "zustand";
import type { Timeframe } from "@apex/types";

type DashboardState = {
  activePair: string;
  activeTimeframe: Timeframe;
  setActivePair: (pair: string) => void;
  setActiveTimeframe: (tf: Timeframe) => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  activePair: "EURUSD",
  activeTimeframe: "H4",
  setActivePair: (activePair) => set({ activePair }),
  setActiveTimeframe: (activeTimeframe) => set({ activeTimeframe }),
}));

export const selectActivePair = (state: DashboardState) => state.activePair;
export const selectActiveTimeframe = (state: DashboardState) => state.activeTimeframe;
