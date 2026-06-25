import React from 'react';
import { motion } from 'framer-motion';

interface ZoomControlsProps {
    zoomLevel: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    isFullScreen: boolean;
    onToggleFullScreen: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ zoomLevel, onZoomIn, onZoomOut, isFullScreen, onToggleFullScreen }) => {
    return (
        <motion.div drag dragMomentum={false} className="fixed bottom-4 left-4 z-50 bg-white p-2 rounded-lg shadow-lg flex items-center gap-2 no-print cursor-grab active:cursor-grabbing" dir="ltr">
            <div className="text-slate-300 px-1 pointer-events-none" title="اسحب لتحريك القائمة">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
            </div>
            <button onClick={onZoomOut} className="p-2.5 rounded-md hover:bg-slate-100 disabled:opacity-50" disabled={zoomLevel <= 0.25} aria-label="Zoom Out">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
            <span className="font-bold text-sm text-slate-600 w-12 text-center" aria-live="polite">{(zoomLevel * 100).toFixed(0)}%</span>
            <button onClick={onZoomIn} className="p-2.5 rounded-md hover:bg-slate-100 disabled:opacity-50" disabled={zoomLevel >= 3} aria-label="Zoom In">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button onClick={onToggleFullScreen} className="p-2.5 rounded-md hover:bg-slate-100" aria-label={isFullScreen ? "الخروج من وضع ملء الشاشة" : "الدخول في وضع ملء الشاشة"}>
                {isFullScreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                )}
            </button>
        </motion.div>
    );
};

export default ZoomControls;
