import { create } from "zustand";

import { clamp } from "../../shared/utils/clamp";

export type ViewerMode = "vertical" | "horizontal";

type GoToPageImpl = (page: number) => void;

type ViewerState = {
  mode: ViewerMode;
  currentPage: number;
  numPages: number;
  zoomScale: number;
  isSpreadMode: boolean;
  goToPageImpl: GoToPageImpl | null;
  setNumPages: (numPages: number) => void;
  setMode: (mode: ViewerMode) => void;
  setCurrentPage: (page: number) => void;
  setZoomScale: (scale: number) => void;
  changeZoomBy: (delta: number) => void;
  setSpreadMode: (isSpread: boolean) => void;
  goToPage: (page: number) => void;
  setGoToPageImpl: (impl: GoToPageImpl | null) => void;
};

export const useViewerStore = create<ViewerState>((set, get) => ({
  mode: "vertical",
  currentPage: 1,
  numPages: 1,
  zoomScale: 1,
  isSpreadMode: false,
  goToPageImpl: null,
  setNumPages: (numPages) => {
    const safeNumPages = Math.max(1, numPages);
    set((state) => ({
      numPages: safeNumPages,
      currentPage: clamp(state.currentPage, 1, safeNumPages),
    }));
  },
  setMode: (mode) => set({ mode }),
  setCurrentPage: (page) => {
    const { numPages } = get();
    set({ currentPage: clamp(page, 1, Math.max(1, numPages)) });
  },
  setZoomScale: (scale) => {
    set({ zoomScale: clamp(scale, 0.5, 3) });
  },
  changeZoomBy: (delta) => {
    const { zoomScale } = get();
    const next = Math.round((zoomScale + delta) * 100) / 100;
    set({ zoomScale: clamp(next, 0.5, 3) });
  },
  setSpreadMode: (isSpreadMode) => set({ isSpreadMode }),
  goToPage: (page) => {
    const { numPages, goToPageImpl } = get();
    const clamped = clamp(page, 1, Math.max(1, numPages));
    set({ currentPage: clamped });
    goToPageImpl?.(clamped);
  },
  setGoToPageImpl: (impl) => set({ goToPageImpl: impl }),
}));
