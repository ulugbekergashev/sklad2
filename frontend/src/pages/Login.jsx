import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Boxes, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await api('/auth/login', {
                method: 'POST',
                body: { username, password },
            });
            login(data.access_token, data.user);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Login yoki parol noto\'g\'ri');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card animate-in">
                <div className="login-logo">
                    <div className="logo-icon">
                        <Boxes size={28} />
                    </div>
                    <h1>SKLAD WMS</h1>
                    <p>Ombor boshqaruv tizimi</p>
                </div>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Foydalanuvchi nomi</label>
                        <input
                            className="form-input"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="admin"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Parol</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="form-input"
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'var(--text-tertiary)',
                                    cursor: 'pointer', padding: 4,
                                }}
                            >
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Kirish...' : 'Tizimga kirish'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    Demo: admin / admin123
                </p>
            </div>
        </div>
    );
}
