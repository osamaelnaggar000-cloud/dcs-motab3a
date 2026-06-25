import React, { ReactNode, useEffect } from 'react';

interface AppLayoutProps {
    isFullScreen: boolean;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    header: ReactNode;
    sidebar: ReactNode;
    children: ReactNode;
    zoomControls: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
    isFullScreen,
    isSidebarOpen,
    setIsSidebarOpen,
    header,
    sidebar,
    children,
    zoomControls
}) => {
    useEffect(() => {
        if (isSidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isSidebarOpen]);

    return (
        <div className="flex flex-col h-screen bg-slate-100 font-sans" dir="rtl">
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                    aria-hidden="true"
                ></div>
            )}
            
            {!isFullScreen && header}
            
            <div className="flex flex-1 overflow-hidden">
                {sidebar}
                
                <main className={`flex-1 overflow-auto ${isFullScreen ? 'fixed inset-0 z-40 p-4 bg-slate-50' : 'p-4 md:p-6'}`}>
                    {children}
                </main>
            </div>

            {zoomControls}
        </div>
    );
};
