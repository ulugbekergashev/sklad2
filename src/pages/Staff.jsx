import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, X, Shield, User } from 'lucide-react';

export default function Staff({ token }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'warehouse_staff', phone: '' });

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users', { headers });
            setUsers(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const openAdd = () => {
        setEditUser(null);
        setForm({ username: '', password: '', full_name: '', role: 'warehouse_staff', phone: '' });
        setShowModal(true);
    };

    const openEdit = (u) => {
        setEditUser(u);
        setForm({ username: u.username, password: '', full_name: u.full_name, role: u.role, phone: u.phone || '' });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const url = editUser ? `/api/users/${editUser.id}` : '/api/users';
            const method = editUser ? 'PUT' : 'POST';
            const body = editUser
                ? { full_name: form.full_name, role: form.role, phone: form.phone, ...(form.password ? { password: form.password } : {}) }
                : form;
            const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
            if (res.ok) {
                setShowModal(false);
                fetchUsers();
            } else {
                const err = await res.json();
                alert(err.error || 'Xatolik');
            }
        } catch (err) { alert('Server xatosi'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Xodimni o\'chirmoqchimisiz?')) return;
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers });
            if (res.ok) fetchUsers();
            else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (err) { alert('Xatolik'); }
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Xodimlar</h1>
                    <p className="page-subtitle">Jami: {users.length} ta xodim</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>
                    <Plus size={18} /> Xodim qo'shish
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Ism familiya</th>
                            <th>Username</th>
                            <th>Telefon</th>
                            <th>Roli</th>
                            <th>Qo'shilgan</th>
                            <th>Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr><td colSpan={7}>
                                <div className="empty-state">
                                    <Users size={48} />
                                    <h3>Xodimlar topilmadi</h3>
                                </div>
                            </td></tr>
                        ) : users.map((u, i) => (
                            <tr key={u.id}>
                                <td>{i + 1}</td>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: u.role === 'admin' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0,
                                        }}>
                                            {u.full_name?.charAt(0)}
                                        </div>
                                        {u.full_name}
                                    </div>
                                </td>
                                <td><span className="badge badge-purple">{u.username}</span></td>
                                <td style={{ fontSize: '0.85rem', color: u.phone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                    {u.phone || '—'}
                                    {u.telegram_chat_id && <span title="Telegram ulangan" style={{ marginLeft: '4px' }}>✈️</span>}
                                </td>
                                <td>
                                    <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-success'}`}>
                                        {u.role === 'admin' ? '🛡️ Admin' : '📦 Xodim'}
                                    </span>
                                </td>
                                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {new Date(u.createdAt).toLocaleDateString('uz-UZ')}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button className="btn-icon" onClick={() => openEdit(u)} title="Tahrirlash"><Edit2 size={16} /></button>
                                        {u.username !== 'admin' && (
                                            <button className="btn-icon" onClick={() => handleDelete(u.id)} title="O'chirish" style={{ color: 'var(--danger)' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title">{editUser ? 'Xodimni tahrirlash' : 'Yangi xodim'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Ism familiya *</label>
                                    <input className="form-input" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="To'liq ism" />
                                </div>
                                {!editUser && (
                                    <div className="form-group">
                                        <label className="form-label">Username *</label>
                                        <input className="form-input" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="login_nomi" />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">{editUser ? 'Yangi parol (bo\'sh qoldirsa o\'zgarmaydi)' : 'Parol *'}</label>
                                    <input className="form-input" type="password" required={!editUser} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Telefon (Telegram uchun)</label>
                                        <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+998901234567" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Roli</label>
                                        <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                            <option value="warehouse_staff">Ombor xodimi</option>
                                            <option value="admin">Administrator</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-primary">{editUser ? 'Saqlash' : 'Qo\'shish'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
