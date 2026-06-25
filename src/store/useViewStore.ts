import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GanttViewMode } from '../types';

interface ViewState {
    zoomLevel: number;
    setZoomLevel: (level: number | ((prev: number) => number)) => void;
    isFullScreen: boolean;
    setIsFullScreen: (val: boolean | ((prev: boolean) => boolean)) => void;
    showCriticalPath: boolean;
    setShowCriticalPath: (val: boolean | ((prev: boolean) => boolean)) => void;
    viewMode: GanttViewMode;
    setViewMode: (mode: GanttViewMode) => void;

    resetView: () => void;
}

export const useViewStore = create<ViewState>()(
    persist(
        (set) => ({
            zoomLevel: 1,
            setZoomLevel: (level) => set((state) => ({ zoomLevel: typeof level === 'function' ? level(state.zoomLevel) : level })),
            isFullScreen: false,
            setIsFullScreen: (val) => set((state) => ({ isFullScreen: typeof val === 'function' ? val(state.isFullScreen) : val })),
            showCriticalPath: false,
            setShowCriticalPath: (val) => set((state) => ({ showCriticalPath: typeof val === 'function' ? val(state.showCriticalPath) : val })),
            viewMode: 'classic',
            setViewMode: (mode) => set({ viewMode: mode }),

            resetView: () => set({
                zoomLevel: 1,
                isFullScreen: false,
                showCriticalPath: false,
                viewMode: 'classic',
            })
        }),
        {
            name: 'view-storage',
            partialize: (state) => ({
                zoomLevel: state.zoomLevel,
                showCriticalPath: state.showCriticalPath,
                viewMode: state.viewMode,
            }),
        }
    )
);
