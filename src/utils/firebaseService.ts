import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const getDocumentFromDB = async <T>(docId: string): Promise<T | undefined> => {
  try {
    const docRef = doc(db, 'appState', docId);
    const docSnap = await Promise.race([
      getDoc(docRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
    ]) as any;
    
    if (docSnap.exists()) {
      return docSnap.data() as T;
    }
  } catch (error) {
    console.error(`Error loading ${docId}:`, error);
  }
  return undefined;
};

export const saveDocumentToDB = async <T extends Record<string, any>>(docId: string, data: T): Promise<void> => {
  try {
    const docRef = doc(db, 'appState', docId);
    await Promise.race([
      setDoc(docRef, data),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout saving")), 15000))
    ]);
  } catch (error) {
    console.error(`Error saving ${docId}:`, error);
  }
};
