import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface AppBackupData {
    version: number;
    timestamp: string;
    ganttStateStore?: any;
    personnelStateStore?: any;
    holidaysStateStore?: any;
    locationStateStore?: any;
    locationsListStore?: any;
    absenceStateStore?: any;
    hierarchyStateStore?: any;
    rolesStateStore?: any;
}

const COLLECTIONS = {
    ganttStateStore: 'ganttStateStore',
    personnelStateStore: 'personnelStateStore',
    holidaysStateStore: 'holidaysStateStore',
    locationStateStore: 'locationStateStore',
    locationsListStore: 'locationsListStore',
    absenceStateStore: 'absenceStateStore',
    hierarchyStateStore: 'hierarchyStateStore',
    rolesStateStore: 'rolesStateStore',
};

export const exportAllData = async (): Promise<AppBackupData> => {
    const backup: AppBackupData = {
        version: 1,
        timestamp: new Date().toISOString(),
    };

    try {
        const promises = Object.values(COLLECTIONS).map(async (storeName) => {
            const docRef = doc(db, 'appState', storeName);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                (backup as any)[storeName] = docSnap.data();
            }
        });

        await Promise.all(promises);
        return backup;
    } catch (error) {
        console.error('Error exporting data from Firestore:', error);
        throw error;
    }
};

export const importAllData = async (backupData: AppBackupData): Promise<void> => {
    if (!backupData || backupData.version !== 1) {
        throw new Error('ملف النسخة الاحتياطية غير صالح أو غير متوافق.');
    }

    try {
        const promises = Object.values(COLLECTIONS).map(async (storeName) => {
            const storeData = (backupData as any)[storeName];
            if (storeData) {
                const docRef = doc(db, 'appState', storeName);
                await setDoc(docRef, storeData);
            }
        });

        await Promise.all(promises);
    } catch (error) {
        console.error('Error importing data to Firestore:', error);
        throw error;
    }
};
