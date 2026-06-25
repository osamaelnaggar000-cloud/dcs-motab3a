import { useState, useEffect, useCallback } from 'react';
import { getDocumentFromDB, saveDocumentToDB } from '../utils/firebaseService';

const STORE_ID = 'locationsListStore';

export const useLocationsListState = () => {
    const [locationsList, setLocationsList] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadState = async () => {
            try {
                const savedState = await getDocumentFromDB<{ locations: string[] }>(STORE_ID);
                if (savedState?.locations && savedState.locations.length > 0) {
                    setLocationsList(savedState.locations);
                } else {
                    await saveDocumentToDB(STORE_ID, { locations: [] });
                    setLocationsList([]);
                }
            } catch (error) {
                setLocationsList([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadState();
    }, []);

    const addLocation = useCallback((newLocation: string) => {
        setLocationsList(prev => {
            if (prev.includes(newLocation)) return prev;
            const newList = [...prev, newLocation];
            saveDocumentToDB(STORE_ID, { locations: newList }).catch(console.error);
            return newList;
        });
    }, []);

    const updateLocation = useCallback((oldLocation: string, newLocation: string) => {
        setLocationsList(prev => {
            const newList = prev.map(loc => loc === oldLocation ? newLocation : loc);
            saveDocumentToDB(STORE_ID, { locations: newList }).catch(console.error);
            return newList;
        });
    }, []);

    const deleteLocation = useCallback((locationToDelete: string) => {
        setLocationsList(prev => {
            const newList = prev.filter(loc => loc !== locationToDelete);
            saveDocumentToDB(STORE_ID, { locations: newList }).catch(console.error);
            return newList;
        });
    }, []);

    return { locationsList, addLocation, updateLocation, deleteLocation, isLoading };
};
