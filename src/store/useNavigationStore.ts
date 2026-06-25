import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Administration, Section } from '../types';

interface NavigationState {
    selectedLineIndex: number;
    setSelectedLineIndex: (index: number) => void;
    activeAdmin: Administration | null;
    setActiveAdmin: (admin: Administration | null) => void;
    selectedSection: Section | null;
    setSelectedSection: (section: Section | null) => void;
    sidebarView: 'admin' | 'location' | 'sector';
    setSidebarView: (view: 'admin' | 'location' | 'sector') => void;
    selectedLocation: string | null;
    setSelectedLocation: (loc: string | null) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => void;

    resetNavigation: () => void;
}

export const useNavigationStore = create<NavigationState>()(
    persist(
        (set) => ({
            selectedLineIndex: 0,
            setSelectedLineIndex: (index) => set({ selectedLineIndex: index }),
            activeAdmin: null,
            setActiveAdmin: (admin) => set({ activeAdmin: admin }),
            selectedSection: null,
            setSelectedSection: (section) => set({ selectedSection: section }),
            sidebarView: 'admin',
            setSidebarView: (view) => set({ sidebarView: view }),
            selectedLocation: null,
            setSelectedLocation: (loc) => set({ selectedLocation: loc }),
            isSidebarOpen: false,
            setIsSidebarOpen: (val) => set((state) => ({ isSidebarOpen: typeof val === 'function' ? val(state.isSidebarOpen) : val })),

            resetNavigation: () => set({
                selectedLineIndex: 0,
                activeAdmin: null,
                selectedSection: null,
                sidebarView: 'admin',
                selectedLocation: null,
                isSidebarOpen: false,
            })
        }),
        {
            name: 'navigation-storage',
            partialize: (state) => ({
                selectedLineIndex: state.selectedLineIndex,
                activeAdmin: state.activeAdmin ? ({ id: state.activeAdmin.id, name: state.activeAdmin.name, sections: [] } as any) : null,
                selectedSection: state.selectedSection ? ({ id: state.selectedSection.id, name: state.selectedSection.name, tasks: [] } as any) : null,
                sidebarView: state.sidebarView,
                selectedLocation: state.selectedLocation,
            }),
        }
    )
);
