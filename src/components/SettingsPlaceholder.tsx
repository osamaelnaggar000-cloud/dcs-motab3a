import React from 'react';
import { Link } from 'react-router-dom';

const SettingsPlaceholder = () => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-screen text-slate-700 font-sans" dir="rtl">
            <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full text-center border border-slate-100">
                <svg className="w-20 h-20 text-emerald-500 mx-auto mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h1 className="text-3xl font-bold mb-4 text-zinc-800">إعدادات النظام</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    هذه الصفحة مخصصة لإعدادات النظام المستقبلية بفضل تقنية الـ Routing التي تم إضافتها.
                </p>
                <Link to="/" className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md">
                    العودة إلى لوحة المتابعة
                </Link>
            </div>
        </div>
    );
};

export default SettingsPlaceholder;
