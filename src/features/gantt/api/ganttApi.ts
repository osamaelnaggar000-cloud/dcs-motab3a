import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocumentFromDB, saveDocumentToDB } from '../../../utils/firebaseService';
import type { NormalizedGanttState } from '../types';
import { migrateToNormalizedState } from '../utils/migration';
import type { ProductionLine } from '../../../types';

const STORE_KEY = 'ganttStateStore';
const DATA_VERSION = 5;
const DEFAULT_PROJECT_START_DATE = new Date('2025-08-16T00:00:00Z').toISOString();
const DEFAULT_TOTAL_PROJECT_DAYS = 138;

export const useGanttData = () => {
  return useQuery({
    queryKey: ['ganttState'],
    queryFn: async (): Promise<NormalizedGanttState> => {
      const savedState = await getDocumentFromDB<any>(STORE_KEY);
      
      if (!savedState) {
        // Initialize default
        return migrateToNormalizedState(
          [
            { id: `line-${Date.now()}-1`, name: 'الخط الأول', administrations: [] },
            { id: `line-${Date.now()}-2`, name: 'الخط الثاني', administrations: [] }
          ],
          DEFAULT_PROJECT_START_DATE,
          DEFAULT_TOTAL_PROJECT_DAYS
        );
      }

      if (savedState.version === 4) {
        return migrateToNormalizedState(
          savedState.lines, 
          savedState.projectStartDate || DEFAULT_PROJECT_START_DATE, 
          savedState.totalProjectDays || DEFAULT_TOTAL_PROJECT_DAYS
        );
      }

      // Reassemble tasks from chunks if they exist
      if (savedState.tasksChunkCount) {
        const tasks: Record<string, any> = {};
        const chunkPromises = [];
        for (let i = 0; i < savedState.tasksChunkCount; i++) {
          chunkPromises.push(getDocumentFromDB<any>(`${STORE_KEY}_tasks_${i}`));
        }
        const chunks = await Promise.all(chunkPromises);
        chunks.forEach(chunk => {
          if (chunk && chunk.tasks) {
            Object.assign(tasks, chunk.tasks);
          }
        });
        savedState.tasks = tasks;
      }

      return savedState as NormalizedGanttState;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSaveGanttData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newState: NormalizedGanttState) => {
      const MAX_TASKS_PER_CHUNK = 500;
      const taskEntries = Object.entries(newState.tasks);
      const chunkCount = Math.ceil(taskEntries.length / MAX_TASKS_PER_CHUNK);
      
      const promises: Promise<void>[] = [];
      for (let i = 0; i < chunkCount; i++) {
        const chunkTasks = Object.fromEntries(taskEntries.slice(i * MAX_TASKS_PER_CHUNK, (i + 1) * MAX_TASKS_PER_CHUNK));
        promises.push(saveDocumentToDB(`${STORE_KEY}_tasks_${i}`, { tasks: chunkTasks }));
      }
      
      const stateToSave = {
          ...newState,
          tasks: {}, // omit tasks from main doc to save space
          tasksChunkCount: chunkCount
      };
      promises.push(saveDocumentToDB(STORE_KEY, stateToSave));
      
      await Promise.all(promises);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['ganttState'], variables);
    },
  });
};
