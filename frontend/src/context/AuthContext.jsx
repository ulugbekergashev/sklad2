import { createContext, useContext, useState, useEffect } from 'react';
import { apiGet, setToken, removeToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('sklad_token');
        if (token) {
            apiGet('/auth/me')
                .then(setUser)
                .catch(() => { removeToken(); setUser(null); })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = (token, userData) => {
        setToken(token);
        setUser(userData);
    };

    const logout = () => {
        removeToken();
        setUser(null);
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
