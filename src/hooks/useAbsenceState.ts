import { useState, useEffect, useCallback } from 'react';
import type { AbsenceData, AbsenceRecord } from '../types';
import { getDocumentFromDB, saveDocumentToDB } from '../utils/firebaseService';
import { produce } from 'immer';

const STORE_ID = 'absenceStateStore';

export const useAbsenceState = () => {
  const [absenceData, setAbsenceData] = useState<AbsenceData>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await getDocumentFromDB<AbsenceData>(STORE_ID);
        if (savedState) {
          setAbsenceData(savedState);
        } else {
          const initialState = {};
          await saveDocumentToDB(STORE_ID, initialState);
          setAbsenceData(initialState);
        }
      } catch (error) {
        setAbsenceData({});
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, []);

  const addAbsence = useCallback((personnelId: string, record: Omit<AbsenceRecord, 'id'>) => {
    setAbsenceData(prev => {
      const newRecord: AbsenceRecord = {
        ...record,
        id: `absence-${Date.now()}-${crypto.randomUUID().substr(0, 9)}`,
      };
      const nextState = produce(prev, draft => {
        if (!draft[personnelId]) {
          draft[personnelId] = [];
        }
        draft[personnelId].push(newRecord);
      });
      saveDocumentToDB(STORE_ID, nextState);
      return nextState;
    });
  }, []);

  const updateAbsence = useCallback((personnelId: string, recordId: string, updatedRecord: Omit<AbsenceRecord, 'id'>) => {
    setAbsenceData(prev => {
      const nextState = produce(prev, draft => {
        if (draft[personnelId]) {
          const recordIndex = draft[personnelId].findIndex((r: AbsenceRecord) => r.id === recordId);
          if (recordIndex !== -1) {
            draft[personnelId][recordIndex] = { ...updatedRecord, id: recordId };
          }
        }
      });
      saveDocumentToDB(STORE_ID, nextState);
      return nextState;
    });
  }, []);

  const deleteAbsence = useCallback((personnelId: string, recordId: string) => {
    setAbsenceData(prev => {
      const nextState = produce(prev, draft => {
        if (draft[personnelId]) {
          draft[personnelId] = draft[personnelId].filter((r: AbsenceRecord) => r.id !== recordId);
        }
      });
      saveDocumentToDB(STORE_ID, nextState);
      return nextState;
    });
  }, []);

  return { absenceData, addAbsence, updateAbsence, deleteAbsence, isLoading };
};





