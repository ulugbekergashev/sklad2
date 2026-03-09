import { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, X } from 'lucide-react';

const PRESET_COLORS = ['#6366f1', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

export default function Categories({ token }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editCat, setEditCat] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories', { headers });
            setCategories(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCategories(); }, []);

    const openAdd = () => {
        setEditCat(null);
        setForm({ name: '', description: '', color: '#6366f1' });
        setShowModal(true);
    };

    const openEdit = (c) => {
        setEditCat(c);
        setForm({ name: c.name, description: c.description || '', color: c.color || '#6366f1' });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const url = editCat ? `/api/categories/${editCat.id}` : '/api/categories';
            const method = editCat ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
            if (res.ok) {
                setShowModal(false);
                fetchCategories();
            } else {
                const err = await res.json();
                alert(err.error || 'Xatolik');
            }
        } catch (err) { alert('Server xatosi'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Kategoriyani o\'chirmoqchimisiz?')) return;
        try {
            await fetch(`/api/categories/${id}`, { method: 'DELETE', headers });
            fetchCategories();
        } catch (err) { alert('Xatolik'); }
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Kategoriyalar</h1>
                    <p className="page-subtitle">Jami: {categories.length} ta kategoriya</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>
                    <Plus size={18} /> Kategoriya qo'shish
                </button>
            </div>

            {/* Categories Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {categories.length === 0 ? (
                    <div className="glass-card" style={{ gridColumn: '1/-1' }}>
                        <div className="empty-state">
                            <Tag size={48} />
                            <h3>Kategoriyalar topilmadi</h3>
                            <p>"Kategoriya qo'shish" tugmasini bosing</p>
                        </div>
                    </div>
                ) : categories.map(c => (
                    <div key={c.id} className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: c.color }} />
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: '10px',
                                    background: `${c.color}20`, color: c.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Tag size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{c.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {c.description || 'Tavsif yo\'q'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn-icon" onClick={() => openEdit(c)} title="Tahrirlash"><Edit2 size={14} /></button>
                                <button className="btn-icon" onClick={() => handleDelete(c.id)} title="O'chirish" style={{ color: 'var(--danger)' }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title">{editCat ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nomi *</label>
                                    <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Kategoriya nomi" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tavsif</label>
                                    <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Qisqacha tavsif..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Rang</label>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {PRESET_COLORS.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setForm({ ...form, color })}
                                                style={{
                                                    width: 32, height: 32, borderRadius: '8px', background: color,
                                                    border: form.color === color ? '3px solid white' : '2px solid transparent',
                                                    cursor: 'pointer', transition: 'all 150ms ease',
                                                    transform: form.color === color ? 'scale(1.15)' : 'scale(1)',
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-primary">{editCat ? 'Saqlash' : 'Qo\'shish'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
