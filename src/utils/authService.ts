import { auth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from '../firebase';

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

export const signInWithEmail = async (email: string, password: string, isSignUp: boolean) => {
  if (isSignUp) {
    return await createUserWithEmailAndPassword(auth, email, password);
  } else {
    return await signInWithEmailAndPassword(auth, email, password);
  }
};

export const logOut = async () => {
  return await signOut(auth);
};

export const getAuthErrorMessage = (code: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
    'auth/user-disabled': 'هذا الحساب معطل',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني',
    'auth/wrong-password': 'كلمة المرور غير صحيحة',
    'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم بالفعل',
    'auth/weak-password': 'كلمة المرور ضعيفة جداً. استخدم 6 أحرف على الأقل',
    'auth/operation-not-allowed': 'هذه العملية غير متاحة حالياً',
    'auth/popup-closed-by-user': 'تم إغلاق نافذة تسجيل الدخول',
    'auth/popup-blocked': 'تم حظر النافذة المنبثقة. تحقق من إعدادات المتصفح',
  };
  return errorMessages[code] || 'حدث خطأ أثناء عملية المصادقة. يرجى المحاولة لاحقاً';
};
