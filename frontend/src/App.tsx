import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Labeling from './pages/Labeling';
import SpreadsheetLabeling from './pages/SpreadsheetLabeling';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem('token');
    return token ? <>{children}</> : <Navigate to="/login" />;
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
