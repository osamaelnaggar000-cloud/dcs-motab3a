import { create } from 'zustand';
import type { Task } from '../types';

export type ModalType = 
    | 'task' 
    | 'export' 
    | 'personnel' 
    | 'absence' 
    | 'holidays' 
    | 'sector' 
    | 'backupRestore' 
    | 'roles' 
    | 'location' 
    | 'reportPreview';

interface ModalState {
    activeModal: ModalType | null;
    openModal: (modal: ModalType) => void;
    closeModal: () => void;

    // Contextual data
    selectedTask: Task | null;
    setSelectedTask: (task: Task | null) => void;
    currentParentId: string | null;
    setCurrentParentId: (id: string | null) => void;

    personnelModalContext: string[] | null;
    setPersonnelModalContext: (ctx: string[] | null) => void;

    reportData: any;
    setReportData: (data: any) => void;
}

export const useModalStore = create<ModalState>((set) => ({
    activeModal: null,
    openModal: (modal) => set({ activeModal: modal }),
    closeModal: () => set({ activeModal: null }),

    selectedTask: null,
    setSelectedTask: (task) => set({ selectedTask: task }),
    currentParentId: null,
    setCurrentParentId: (id) => set({ currentParentId: id }),

    personnelModalContext: null,
    setPersonnelModalContext: (ctx) => set({ personnelModalContext: ctx }),

    reportData: null,
    setReportData: (data) => set({ reportData: data }),
}));
