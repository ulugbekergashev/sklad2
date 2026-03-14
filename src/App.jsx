import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Incoming from './pages/Incoming';
import Sales from './pages/Sales';
import Debts from './pages/Debts';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Staff from './pages/Staff';
import Categories from './pages/Categories';
import Requests from './pages/Requests';
import Returns from './pages/Returns';

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('sklad_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(res => {
                    if (!res.ok) throw new Error('Invalid token');
                    return res.json();
                })
                .then(data => {
                    setUser(data);
                    setLoading(false);
                })
                .catch(() => {
                    localStorage.removeItem('sklad_token');
                    setToken(null);
                    setUser(null);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [token]);

    const handleLogin = (userData, tokenValue) => {
        setUser(userData);
        setToken(tokenValue);
        localStorage.setItem('sklad_token', tokenValue);
    };

    const handleLogout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('sklad_token');
    };

    if (loading) {
        return (
            <div className="loading-spinner" style={{ minHeight: '100vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    if (!user) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <Layout user={user} onLogout={handleLogout}>
            <Routes>
                <Route path="/" element={<Dashboard token={token} />} />
                <Route path="/products" element={<Products token={token} />} />
                <Route path="/incoming" element={<Incoming token={token} />} />
                <Route path="/sales" element={<Sales token={token} />} />
                <Route path="/debts" element={<Debts token={token} />} />
                <Route path="/requests" element={<Requests token={token} />} />
                <Route path="/inventory" element={<Inventory token={token} />} />
                <Route path="/reports" element={<Reports token={token} />} />
                <Route path="/staff" element={<Staff token={token} />} />
                <Route path="/categories" element={<Categories token={token} />} />
                <Route path="/returns" element={<Returns token={token} />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Layout>
    );
}

export default App;
