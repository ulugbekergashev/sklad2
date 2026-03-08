import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete, apiPut } from '../api';
import { Plus, Trash2, Key, Users, Tag, Truck } from 'lucide-react';
import Modal from '../components/Modal';

export default function Settings() {
    const [tab, setTab] = useState('categories');

    // ─── Kategoriyalar ───
    const [categories, setCategories] = useState([]);
    const [catForm, setCatForm] = useState({ name: '', description: '', color: '#6366f1' });
    const loadCats = () => apiGet('/categories/').then(setCategories).catch(console.error);

    const addCategory = async (e) => {
        e.preventDefault();
        try { await apiPost('/categories/', catForm); setCatForm({ name: '', description: '', color: '#6366f1' }); loadCats(); }
        catch (err) { alert(err.message); }
    };

    const deleteCat = async (id) => {
        if (!confirm("O'chirmoqchimisiz?")) return;
        try { await apiDelete(`/categories/${id}`); loadCats(); } catch (err) { alert(err.message); }
    };

    // ─── Yetkazuvchilar ───
    const [suppliers, setSuppliers] = useState([]);
    const [supForm, setSupForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });
    const loadSups = () => apiGet('/suppliers/').then(setSuppliers).catch(console.error);

    const addSupplier = async (e) => {
        e.preventDefault();
        try { await apiPost('/suppliers/', supForm); setSupForm({ name: '', contact_person: '', phone: '', email: '', address: '' }); loadSups(); }
        catch (err) { alert(err.message); }
    };

    const deleteSup = async (id) => {
        if (!confirm("O'chirmoqchimisiz?")) return;
        try { await apiDelete(`/suppliers/${id}`); loadSups(); } catch (err) { alert(err.message); }
    };

    // ─── Foydalanuvchilar ───
    const [users, setUsers] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState({ username: '', password: '', full_name: '', role: 'warehouse_staff' });
    const [pwModal, setPwModal] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const loadUsers = () => apiGet('/auth/users').then(setUsers).catch(console.error);

    const addUser = async (e) => {
        e.preventDefault();
        try {
            await apiPost('/auth/register', userForm);
            setShowUserModal(false);
            setUserForm({ username: '', password: '', full_name: '', role: 'warehouse_staff' });
            loadUsers();
        } catch (err) { alert(err.message); }
    };

    const deleteUser = async (id) => {
        if (!confirm("Foydalanuvchini o'chirmoqchimisiz?")) return;
        try { await apiDelete(`/auth/users/${id}`); loadUsers(); } catch (err) { alert(err.message); }
    };

    const changePassword = async (e) => {
        e.preventDefault();
        try {
            await apiPut(`/auth/users/${pwModal.id}/password`, { password: newPassword });
            alert("Parol o'zgartirildi!");
            setPwModal(null);
            setNewPassword('');
        } catch (err) { alert(err.message); }
    };

    useEffect(() => { loadCats(); loadSups(); loadUsers(); }, []);

    const roleLabels = { admin: 'Administrator', manager: 'Menejer', warehouse_staff: 'Omborchi' };

    const tabs = [
        { id: 'categories', label: 'Kategoriyalar', icon: Tag },
        { id: 'suppliers', label: 'Yetkazuvchilar', icon: Truck },
        { id: 'users', label: 'Foydalanuvchilar', icon: Users },
    ];

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-title">Sozlamalar</div>
                    <div className="page-subtitle">Tizim sozlamalari</div>
                </div>
            </div>

            <div className="page-body animate-in">
                <div className="btn-group" style={{ marginBottom: 20 }}>
                    {tabs.map(t => (
                        <button key={t.id} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <t.icon size={14} /> {t.label}
                        </button>
                    ))}
                </div>

                {/* ═══ Kategoriyalar ═══ */}
                {tab === 'categories' && (
                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Kategoriyalar</h3>
                        </div>
                        <div className="card-body">
                            <form onSubmit={addCategory} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                <input className="form-input" placeholder="Nomi *" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required style={{ flex: 1, minWidth: 150 }} />
                                <input className="form-input" placeholder="Tavsif" value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} style={{ flex: 1, minWidth: 150 }} />
                                <input type="color" value={catForm.color} onChange={e => setCatForm({ ...catForm, color: e.target.value })} style={{ width: 44, height: 38, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
                                <button className="btn btn-primary btn-sm" type="submit"><Plus size={14} /> Qo'shish</button>
                            </form>
                            <table className="data-table">
                                <thead><tr><th>Rang</th><th>Nomi</th><th>Tavsif</th><th style={{ width: 48 }}></th></tr></thead>
                                <tbody>
                                    {categories.map(c => (
                                        <tr key={c.id}>
                                            <td><div style={{ width: 20, height: 20, borderRadius: 4, background: c.color }} /></td>
                                            <td style={{ fontWeight: 600 }}>{c.name}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{c.description || '—'}</td>
                                            <td><button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteCat(c.id)}><Trash2 size={14} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═══ Yetkazuvchilar ═══ */}
                {tab === 'suppliers' && (
                    <div className="card">
                        <div className="card-header"><h3>Yetkazib beruvchilar</h3></div>
                        <div className="card-body">
                            <form onSubmit={addSupplier} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                <input className="form-input" placeholder="Kompaniya nomi *" value={supForm.name} onChange={e => setSupForm({ ...supForm, name: e.target.value })} required style={{ flex: 1, minWidth: 150 }} />
                                <input className="form-input" placeholder="Mas'ul shaxs" value={supForm.contact_person} onChange={e => setSupForm({ ...supForm, contact_person: e.target.value })} style={{ flex: 1, minWidth: 120 }} />
                                <input className="form-input" placeholder="Telefon" value={supForm.phone} onChange={e => setSupForm({ ...supForm, phone: e.target.value })} style={{ width: 140 }} />
                                <button className="btn btn-primary btn-sm" type="submit"><Plus size={14} /> Qo'shish</button>
                            </form>
                            <table className="data-table">
                                <thead><tr><th>Kompaniya</th><th>Mas'ul shaxs</th><th>Telefon</th><th>Email</th><th style={{ width: 48 }}></th></tr></thead>
                                <tbody>
                                    {suppliers.map(s => (
                                        <tr key={s.id}>
                                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                                            <td>{s.contact_person || '—'}</td>
                                            <td>{s.phone || '—'}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{s.email || '—'}</td>
                                            <td><button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteSup(s.id)}><Trash2 size={14} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═══ Foydalanuvchilar ═══ */}
                {tab === 'users' && (
                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Foydalanuvchilar</h3>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowUserModal(true)}>
                                <Plus size={14} /> Yangi foydalanuvchi
                            </button>
                        </div>
                        <div className="card-body">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Ism</th>
                                        <th>Login</th>
                                        <th>Lavozim</th>
                                        <th>Qo'shilgan sana</th>
                                        <th style={{ width: 100 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr><td colSpan={5} className="table-empty"><Users size={40} /><div>Foydalanuvchilar yo'q</div></td></tr>
                                    ) : users.map(u => (
                                        <tr key={u.id}>
                                            <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                                            <td className="cell-mono">{u.username}</td>
                                            <td>
                                                <span className="cell-badge" style={{
                                                    background: u.role === 'admin' ? 'rgba(239,68,68,0.15)' : u.role === 'manager' ? 'rgba(99,102,241,0.15)' : 'rgba(34,197,94,0.15)',
                                                    color: u.role === 'admin' ? '#ef4444' : u.role === 'manager' ? '#818cf8' : '#22c55e',
                                                }}>
                                                    {roleLabels[u.role] || u.role}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString('uz-UZ') : '—'}
                                            </td>
                                            <td>
                                                <div className="btn-group">
                                                    <button className="btn btn-ghost btn-sm btn-icon" title="Parolni o'zgartirish"
                                                        onClick={() => { setPwModal(u); setNewPassword(''); }}>
                                                        <Key size={14} />
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm btn-icon" title="O'chirish"
                                                        onClick={() => deleteUser(u.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Yangi foydalanuvchi modali */}
            <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Yangi foydalanuvchi">
                <form onSubmit={addUser}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">To'liq ism *</label>
                                <input className="form-input" value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Login *</label>
                                <input className="form-input" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} required />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Parol *</label>
                                <input className="form-input" type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} required minLength={4} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Lavozim *</label>
                                <select className="form-select" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                                    <option value="warehouse_staff">Omborchi</option>
                                    <option value="manager">Menejer</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Bekor</button>
                        <button type="submit" className="btn btn-primary">Qo'shish</button>
                    </div>
                </form>
            </Modal>

            {/* Parol o'zgartirish modali */}
            <Modal isOpen={!!pwModal} onClose={() => setPwModal(null)} title={`Parol o'zgartirish — ${pwModal?.full_name}`}>
                <form onSubmit={changePassword}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Yangi parol *</label>
                            <input className="form-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={4} placeholder="Kamida 4 ta belgi" />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setPwModal(null)}>Bekor</button>
                        <button type="submit" className="btn btn-primary"><Key size={14} /> O'zgartirish</button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
