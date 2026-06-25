import React from 'react';

interface PendingApprovalScreenProps {
    onSignOut: () => void;
}

const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({ onSignOut }) => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-100 font-sans" dir="rtl">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-3">حسابك قيد المراجعة</h1>
                <p className="text-slate-600 mb-8 leading-relaxed">
                    مرحباً بك في النظام. حسابك حالياً في انتظار موافقة الإدارة. يرجى الانتظار حتى يتم تعيين دور لك لكي تتمكن من الدخول.
                </p>
                <button
                    onClick={onSignOut}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors w-full"
                >
                    تسجيل الخروج
                </button>
            </div>
        </div>
    );
};

export default PendingApprovalScreen;
