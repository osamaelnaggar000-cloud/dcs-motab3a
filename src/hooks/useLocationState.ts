import { useState, useEffect, useCallback } from 'react';
import type { LocationAssignmentData } from '../types';
import { getDocumentFromDB, saveDocumentToDB } from '../utils/firebaseService';
import { produce } from 'immer';

const STORE_ID = 'locationStateStore';

const getInitialLocationData = (): LocationAssignmentData => ({});

export const useLocationState = () => {
  const [locationAssignments, setLocationAssignments] = useState<LocationAssignmentData>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load state from DB on initial mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await getDocumentFromDB<LocationAssignmentData>(STORE_ID);
        if (savedState && Object.keys(savedState).length > 0) {
          setLocationAssignments(savedState);
        } else {
          const initialState = getInitialLocationData();
          await saveDocumentToDB(STORE_ID, initialState);
          setLocationAssignments(initialState);
        }
      } catch (error) {
        setLocationAssignments(getInitialLocationData());
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, []);

  // Save state to DB whenever it changes
  useEffect(() => {
    if (isLoading) {
      return;
    }
    const saveState = async () => {
      try {
        await saveDocumentToDB(STORE_ID, locationAssignments);
      } catch (error) {
        // Handle error if needed
      }
    };
    saveState();
  }, [locationAssignments, isLoading]);

  const setAssignment = useCallback((id: string, location: string) => {
    setLocationAssignments(prevAssignments => ({
      ...prevAssignments,
      [id]: location,
    }));
  }, []);

  const removeAssignment = useCallback((id: string) => {
    setLocationAssignments(prevAssignments => {
      const newAssignments = { ...prevAssignments };
      delete newAssignments[id];
      return newAssignments;
    });
  }, []);

  const renameLocationAssignment = useCallback((oldLocation: string, newLocation: string) => {
    setLocationAssignments(prevAssignments => {
      const newAssignments = { ...prevAssignments };
      let updated = false;
      for (const id in newAssignments) {
        if (newAssignments[id] === oldLocation) {
          newAssignments[id] = newLocation;
          updated = true;
        }
      }
      return updated ? newAssignments : prevAssignments;
    });
  }, []);

  return { locationAssignments, setAssignment, removeAssignment, renameLocationAssignment, isLoading };
};




