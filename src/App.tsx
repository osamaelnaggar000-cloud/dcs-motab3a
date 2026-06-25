import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./components/Dashboard'));
const SettingsPlaceholder = lazy(() => import('./components/SettingsPlaceholder'));

const App: React.FC = () => {
    return (
        <Router>
            <Suspense fallback={
                <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            }>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/settings" element={<SettingsPlaceholder />} />
                </Routes>
            </Suspense>
        </Router>
    );
};

export default App;