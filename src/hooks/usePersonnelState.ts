import { useState, useEffect, useCallback } from 'react';
import type { Personnel, PersonnelData } from '../types';
import { getDocumentFromDB, saveDocumentToDB } from '../utils/firebaseService';
import { produce } from 'immer';

const STORE_ID = 'personnelStateStore';

const getInitialPersonnelData = (): PersonnelData => ({
  personnel: {},
});

export const usePersonnelState = () => {
  const [personnelData, setPersonnelData] = useState<PersonnelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await getDocumentFromDB<PersonnelData>(STORE_ID);
        if (savedState) {
          setPersonnelData(savedState);
        } else {
          const initialState = getInitialPersonnelData();
          await saveDocumentToDB(STORE_ID, initialState);
          setPersonnelData(initialState);
        }
      } catch (error) {
        setPersonnelData(getInitialPersonnelData());
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, []);

  const updateAndSave = useCallback(async (newPersonnelData: PersonnelData) => {
    setPersonnelData(newPersonnelData);
    await saveDocumentToDB(STORE_ID, newPersonnelData);
  }, []);

  const addPerson = useCallback((name: string, nodeId: string, assignment: string, jobTitle?: string) => {
    setPersonnelData(prev => {
      if (!prev) return prev;
      const newId = `person-${Date.now()}-${crypto.randomUUID().substr(0, 9)}`;
      const nextState = produce(prev, draft => {
        if (!draft.personnel) draft.personnel = {};
        draft.personnel[newId] = { name, assignment, jobTitle, nodeId };
      });
      saveDocumentToDB(STORE_ID, nextState);
      return nextState;
    });
  }, []);

  const updatePerson = useCallback((id: string, newName: string, newNodeId: string, newAssignment: string, newJobTitle?: string) => {
    setPersonnelData(prev => {
      if (!prev) return prev;
      const nextState = produce(prev, draft => {
        if (draft.personnel?.[id]) {
          draft.personnel[id] = { name: newName, assignment: newAssignment, jobTitle: newJobTitle, nodeId: newNodeId };
        }
      });
      saveDocumentToDB(STORE_ID, nextState);
      return nextState;
    });
  }, []);

  const deletePerson = useCallback((id: string) => {
    setPersonnelData(prev => {
      if (!prev) return prev;
      const nextState = produce(prev, draft => {
        if (draft.personnel?.[id]) {
          delete draft.personnel[id];
        }
      });
      saveDocumentToDB(STORE_ID, nextState);
      return nextState;
    });
  }, []);

  return { personnelData, addPerson, updatePerson, deletePerson, isLoading, updateAndSave };
};





