import { create } from "zustand";
import type { PeriodPreset } from "@/mock/calendar";

export type BranchFilter = "all" | string;

interface FiltersState {
  period: PeriodPreset;
  branch: BranchFilter;
  setPeriod: (p: PeriodPreset) => void;
  setBranch: (b: BranchFilter) => void;
}

export const useFilters = create<FiltersState>((set) => ({
  period: "last-12-months",
  branch: "all",
  setPeriod: (period) => set({ period }),
  setBranch: (branch) => set({ branch }),
}));
