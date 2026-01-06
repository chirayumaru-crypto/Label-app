import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Labeling from './pages/Labeling';
import SpreadsheetLabeling from './pages/SpreadsheetLabeling';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        // Check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsAuthenticated(!!session);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (isAuthenticated === null) {
        // Loading state
        return <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="text-white">Loading...</div>
        </div>;
    }

    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
                <PrivateRoute>
                    <Dashboard />
                </PrivateRoute>
            } />
            <Route path="/labeling" element={
                <PrivateRoute>
                    <Labeling />
                </PrivateRoute>
            } />
            <Route path="/spreadsheet/:datasetId" element={
                <PrivateRoute>
                    <SpreadsheetLabeling />
                </PrivateRoute>
            } />
            <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}

export default App;
