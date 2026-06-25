import { useState, useEffect, useCallback } from 'react';
import type { Holiday } from '../types';
import { getDocumentFromDB, saveDocumentToDB } from '../utils/firebaseService';
import { produce } from 'immer';

const STORE_ID = 'holidaysStateStore';

export const useHolidaysState = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await getDocumentFromDB<{ holidays: Holiday[] }>(STORE_ID);
        if (savedState?.holidays) {
          setHolidays(savedState.holidays);
        } else {
          const initialState: Holiday[] = [];
          await saveDocumentToDB(STORE_ID, { holidays: initialState });
          setHolidays(initialState);
        }
      } catch (error) {
        setHolidays([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, []);

  const addHoliday = useCallback((record: Omit<Holiday, 'id'>) => {
    setHolidays(prev => {
      const newRecord: Holiday = {
        ...record,
        id: `holiday-${Date.now()}-${crypto.randomUUID().substr(0, 9)}`,
      };
      const nextState = produce(prev, draft => {
        draft.push(newRecord);
      });
      saveDocumentToDB(STORE_ID, { holidays: nextState });
      return nextState;
    });
  }, []);

  const updateHoliday = useCallback((recordId: string, updatedRecord: Omit<Holiday, 'id'>) => {
    setHolidays(prev => {
      const nextState = produce(prev, draft => {
        const recordIndex = draft.findIndex(h => h.id === recordId);
        if (recordIndex !== -1) {
          draft[recordIndex] = { ...updatedRecord, id: recordId };
        }
      });
      saveDocumentToDB(STORE_ID, { holidays: nextState });
      return nextState;
    });
  }, []);

  const deleteHoliday = useCallback((recordId: string) => {
    setHolidays(prev => {
      const nextState = produce(prev, draft => {
        return draft.filter(h => h.id !== recordId);
      });
      saveDocumentToDB(STORE_ID, { holidays: nextState });
      return nextState;
    });
  }, []);

  return { holidays, addHoliday, updateHoliday, deleteHoliday, isLoading };
};





