import React, { useState, useEffect, createContext, useContext } from 'react';
import { User } from '../firebase';
import { subscribeToAuthChanges, signInWithGoogle, signInWithEmail, logOut, getAuthErrorMessage } from '../utils/authService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

// ─── Auth Context ─────────────────────────────────────────────────────

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: User | null;
  isLoading: boolean;
  handleSignOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  isLoading: true,
  handleSignOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─── Auth Component ───────────────────────────────────────────────────

interface AuthProps {
  children: React.ReactNode;
}

const Auth: React.FC<AuthProps> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);

  const mounted = React.useRef(true);
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (mounted.current) {
        setFirebaseUser(user);
        setLoading(false);
      }
    });

    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, []);

  const authUser: AuthUser | null = firebaseUser ? {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || firebaseUser.email || 'مستخدم',
  } : null;

  const handleGoogleSignIn = async () => {
    setError('');
    setIsAuthProcessing(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (mounted.current) {
        const errorMsg = getAuthErrorMessage(error.code || 'unknown');
        setError(errorMsg);
      }
      console.error('Google sign-in error:', error);
    } finally {
      if (mounted.current) setIsAuthProcessing(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }

    setIsAuthProcessing(true);
    try {
      await signInWithEmail(email, password, isSignUp);
      if (mounted.current) {
        setEmail('');
        setPassword('');
      }
    } catch (error: any) {
      if (mounted.current) {
        const errorMsg = getAuthErrorMessage(error.code || 'unknown');
        setError(errorMsg);
      }
      console.error('Email sign-in error:', error);
    } finally {
      if (mounted.current) setIsAuthProcessing(false);
    }
  };

  const handleSignOut = async () => {
    setError('');
    try {
      await logOut();
    } catch (error: any) {
      setError('فشل تسجيل الخروج. حاول لاحقاً');
      console.error('Sign-out error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-emerald-600">
          <Loader2 className="h-10 w-10 animate-spin" />
          <h2 className="text-xl font-semibold">جاري التحميل...</h2>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden" dir="rtl">
        
        {/* Right Section - Form (on RTL this is the left side visually, but we want it right on desktop) */}
        <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col justify-center px-8 sm:px-16 py-12 bg-white relative z-10 shadow-[0_0_40px_rgba(0,0,0,0.05)] h-screen overflow-y-auto">
          <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Logo and Title */}
            <div className="text-right">
              <div className="w-14 h-14 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center mb-6 text-white transform hover:scale-105 transition-transform duration-300">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                {isSignUp ? 'إنشاء حساب جديد' : 'مرحباً بك مجدداً 👋'}
              </h1>
              <p className="text-slate-500 font-medium text-sm">
                {isSignUp ? 'قم بملء البيانات أدناه لإنشاء حسابك في نظام الصيانة الذكي.' : 'قم بتسجيل الدخول للوصول إلى نظام إدارة الصيانة الذكي.'}
              </p>
            </div>

            {/* Google Sign In */}
            <div className="space-y-4">
              <Button 
                type="button"
                variant="outline" 
                className="w-full h-12 text-base font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 shadow-sm" 
                onClick={handleGoogleSignIn}
                disabled={isAuthProcessing}
              >
                <div className="ml-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                المتابعة باستخدام حساب جوجل
              </Button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">أو</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium flex items-start gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">البريد الإلكتروني</label>
                <div className="relative group">
                  <Mail className="absolute right-3.5 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pr-11 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-base transition-all rounded-xl"
                    disabled={isAuthProcessing}
                    dir="ltr"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700">كلمة المرور</label>
                  {!isSignUp && (
                    <a href="#" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">هل نسيت كلمة المرور؟</a>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute right-3.5 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-11 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-base transition-all rounded-xl"
                    disabled={isAuthProcessing}
                    dir="ltr"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-300"
                disabled={isAuthProcessing}
              >
                {isAuthProcessing ? (
                  <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري المعالجة...</>
                ) : (
                  isSignUp ? 'إنشاء الحساب' : 'تسجيل الدخول'
                )}
              </Button>
            </form>

            <div className="text-center pt-2">
              <p className="text-sm text-slate-600">
                {isSignUp ? 'لديك حساب بالفعل؟ ' : 'ليس لديك حساب؟ '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                  className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                >
                  {isSignUp ? 'سجل دخولك الآن' : 'أنشئ حساباً جديداً'}
                </button>
              </p>
            </div>
            
            <div className="mt-auto pt-8 text-center text-xs font-medium text-slate-400">
              نظام إدارة الصيانة والتخطيط &copy; {new Date().getFullYear()}
            </div>
          </div>
        </div>

        {/* Left Section - Branding/Visual */}
        <div className="hidden md:flex md:w-[55%] lg:w-[60%] relative bg-slate-900 overflow-hidden items-center justify-center p-12">
          {/* Decorative background gradients */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 z-0"></div>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          {/* Content overlay */}
          <div className="relative z-10 w-full max-w-lg animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            {/* Glassy card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <svg className="w-14 h-14 text-emerald-400" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 6 a 44 44 0 0 1 0 88 a 44 44 0 0 1 0 -88 M50 16 a 34 34 0 0 0 0 68 a 34 34 0 0 0 0 -68" fill="currentColor" opacity="0.8"/>
                  <path d="M50 2 L50 14 M93.3 25 L85.98 29.32 M98 50 L86 50 M93.3 75 L85.98 70.68 M50 98 L50 86 M6.7 75 L14.02 70.68 M2 50 L14 50 M6.7 25 L14.02 29.32" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                  <path d="M50 56 C 40 46, 35 46, 40 31 Q 50 46 50 56 Z M50 56 C 60 46, 65 46, 60 31 Q 50 46 50 56 Z M50 56 C 45 41, 55 41, 50 26 Q 50 46 50 56 Z" fill="#ffffff" />
                </svg>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1 tracking-wide">شركة الدلتا للسكر</h2>
                  <p className="text-emerald-300 font-medium">قطاع الهندسة والصيانة</p>
                </div>
              </div>
              
              <h3 className="text-4xl font-extrabold text-white leading-tight mb-6">
                خطط، نفذ، وتابع الصيانة بكفاءة غير مسبوقة.
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-emerald-50">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="font-medium text-lg">تخطيط المسار الحرج والموارد</span>
                </div>
                <div className="flex items-center gap-3 text-emerald-50">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="font-medium text-lg">لوحات معلومات حية وتفاعلية</span>
                </div>
                <div className="flex items-center gap-3 text-emerald-50">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="font-medium text-lg">تقارير ديناميكية وتصدير فوري</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user: authUser, firebaseUser, isLoading: loading, handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export default Auth;