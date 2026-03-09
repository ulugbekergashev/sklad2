import { useState, useEffect } from 'react';
import { Package, Check, AlertCircle, Plus, X, Search, CheckCircle, XCircle } from 'lucide-react';

export default function Requests({ token }) {
    const [requests, setRequests] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [form, setForm] = useState({
        client_name: '', phone: '', product_id: '', product_name: '', quantity: '', expected_date: '', notes: ''
    });
    const [result, setResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const fetchAll = async () => {
        try {
            let url = '/api/requests?';
            if (search) url += `search=${encodeURIComponent(search)}&`;
            if (statusFilter) url += `status=${statusFilter}&`;

            const [reqRes, prodRes] = await Promise.all([
                fetch(url, { headers }),
                fetch('/api/products', { headers })
            ]);

            setRequests(await reqRes.json());
            setProducts(await prodRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchAll();
        }, 300);
        return () => clearTimeout(timeout);
    }, [search, statusFilter]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setResult(null);

        try {
            const res = await fetch('/api/requests', {
                method: 'POST', headers,
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (res.ok) {
                setResult({ success: true, message: 'Buyurtma muvaffaqiyatli qo`shildi!' });
                setForm({ client_name: '', phone: '', product_id: '', product_name: '', quantity: '', expected_date: '', notes: '' });
                setShowForm(false);
                fetchAll();
            } else {
                setResult({ success: false, message: data.error || data.message || 'Xatolik yuz berdi' });
            }
        } catch (err) {
            setResult({ success: false, message: 'Server xatosi' });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`/api/requests/${id}`, {
                method: 'PUT', headers,
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                fetchAll();
            } else {
                alert('Holatni o`zgartirishda xatolik yuz berdi');
            }
        } catch (err) {
            alert('Server xatosi');
        } finally {
            setConfirmModal({ isOpen: false, type: null, id: null, title: '', message: '' });
        }
    };

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`/api/requests/${id}`, {
                method: 'DELETE', headers,
            });
            if (res.ok) {
                fetchAll();
            } else {
                alert('O`chirishda xatolik yuz berdi');
            }
        } catch (err) {
            alert('Server xatosi');
        } finally {
            setConfirmModal({ isOpen: false, type: null, id: null, title: '', message: '' });
        }
    };

    const confirmAction = (type, id, title, message) => {
        setConfirmModal({ isOpen: true, type, id, title, message });
    };

    const executeConfirmAction = () => {
        if (confirmModal.type === 'completed' || confirmModal.type === 'cancelled') {
            handleUpdateStatus(confirmModal.id, confirmModal.type);
        } else if (confirmModal.type === 'delete') {
            handleDelete(confirmModal.id);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--warning)', color: '#000', fontSize: '0.85rem', fontWeight: 600 }}>Kutilmoqda</span>;
            case 'completed':
                return <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--success)', color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Bajarildi</span>;
            case 'cancelled':
                return <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--danger)', color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Bekor qilingan</span>;
            default:
                return <span>{status}</span>;
        }
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Buyurtmalar (Zayavkalar)</h1>
                    <p className="page-subtitle">Jami: {requests.length} ta buyurtma</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowForm(true); setResult(null); }}>
                    <Plus size={18} /> Buyurtma qo'shish
                </button>
            </div>

            {/* Filters */}
            <div className="filters-container glass-card" style={{ marginBottom: '20px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        className="form-input"
                        style={{ paddingLeft: '40px', margin: 0 }}
                        placeholder="Mijoz ismi, telefon yoki mahsulot nomi bilan qidirish..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select className="form-select" style={{ width: 'auto', margin: 0 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">Barcha holatlar</option>
                    <option value="pending">Kutilmoqda</option>
                    <option value="completed">Bajarildi</option>
                    <option value="cancelled">Bekor qilingan</option>
                </select>
            </div>

            {/* Result notification */}
            {result && (
                <div className="glass-card" style={{
                    marginBottom: '24px',
                    borderColor: result.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                    background: result.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {result.success ? <Check size={20} color="var(--success)" /> : <AlertCircle size={20} color="var(--danger)" />}
                        <div style={{ fontWeight: 600, color: result.success ? 'var(--success)' : 'var(--danger)' }}>
                            {result.message}
                        </div>
                    </div>
                </div>
            )}

            {/* Requests Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Yaratildi</th>
                            <th>Mijoz</th>
                            <th>Telefon</th>
                            <th>Mahsulot</th>
                            <th>Olinish Sanasi</th>
                            <th>Holati</th>
                            <th>Izoh</th>
                            <th style={{ textAlign: 'right' }}>Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr><td colSpan={8}>
                                <div className="empty-state">
                                    <Package size={48} />
                                    <h3>Buyurtmalar topilmadi</h3>
                                    <p>Yangi buyurtma qabul qilish uchun "Buyurtma qo'shish" tugmasini bosing</p>
                                </div>
                            </td></tr>
                        ) : requests.map((req) => (
                            <tr key={req.id}>
                                <td style={{ fontSize: '0.85rem' }}>{new Date(req.createdAt).toLocaleDateString('uz-UZ')}</td>
                                <td style={{ fontWeight: 600 }}>{req.client_name}</td>
                                <td>{req.phone || '-'}</td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{req.product ? req.product.name : (req.product_name || '-')}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>M: {parseFloat(req.quantity)} {req.product?.unit || ''}</div>
                                </td>
                                <td>{req.expected_date ? new Date(req.expected_date).toLocaleDateString('uz-UZ') : '-'}</td>
                                <td>{getStatusBadge(req.status)}</td>
                                <td style={{ fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.notes || '-'}</td>
                                <td style={{ textAlign: 'right' }}>
                                    {req.status === 'pending' && (
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                onClick={() => confirmAction('completed', req.id, 'Bajarildi', 'Haqiqatan ham buyurtma holatini ruxsat etmoqchimisiz?')}
                                                className="btn-icon"
                                                title="Bajarildi"
                                                style={{ color: 'var(--success)', cursor: 'pointer', zIndex: 10, position: 'relative' }}
                                            >
                                                <CheckCircle size={18} style={{ pointerEvents: 'none' }} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => confirmAction('cancelled', req.id, 'Bekor qilish', 'Haqiqatan ham buyurtma holatini bekor qilishingizni tasdiqlaysizmi?')}
                                                className="btn-icon"
                                                title="Bekor qilish"
                                                style={{ color: 'var(--warning)', cursor: 'pointer', zIndex: 10, position: 'relative' }}
                                            >
                                                <XCircle size={18} style={{ pointerEvents: 'none' }} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => confirmAction('delete', req.id, 'O\'chirish', 'Haqiqatan ham ushbu buyurtmani o\'chirmoqchimisiz?')}
                                                className="btn-icon"
                                                title="O'chirish"
                                                style={{ color: 'var(--danger)', cursor: 'pointer', zIndex: 10, position: 'relative' }}
                                            >
                                                <X size={18} style={{ pointerEvents: 'none' }} />
                                            </button>
                                        </div>
                                    )}
                                    {req.status !== 'pending' && (
                                        <button
                                            type="button"
                                            onClick={() => confirmAction('delete', req.id, 'O\'chirish', 'Haqiqatan ham ushbu buyurtmani o\'chirmoqchimisiz?')}
                                            className="btn-icon"
                                            title="O'chirish"
                                            style={{ color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex', zIndex: 10, position: 'relative' }}
                                        >
                                            <X size={18} style={{ pointerEvents: 'none' }} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Request Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Yangi Buyurtma</h2>
                            <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Mijoz Ismi *</label>
                                        <input className="form-input" required placeholder="Mijoz ismi" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Telefon</label>
                                        <input className="form-input" placeholder="+998..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Ombordagi Mahsulot (Ixtiyoriy)</label>
                                    <select className="form-select" value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value, product_name: '' })}>
                                        <option value="">-- Mahsulot tanlash --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                        ))}
                                    </select>
                                </div>

                                {!form.product_id && (
                                    <div className="form-group">
                                        <label className="form-label">Mahsulot nomi (Erkin kiritish)</label>
                                        <input className="form-input" placeholder="Omborda yo'q mahsulot nomi" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Miqdori *</label>
                                        <input className="form-input" type="number" step="any" required placeholder="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Olib ketish sanasi</label>
                                        <input className="form-input" type="date" value={form.expected_date} onChange={e => setForm({ ...form, expected_date: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Izoh</label>
                                    <textarea className="form-textarea" placeholder="Qo'shimcha ma'lumotlar..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                </div>

                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    <Plus size={16} />
                                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {confirmModal.isOpen && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal-content" style={{ maxWidth: '400px', animation: 'fadeIn 200ms ease' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{confirmModal.title}</h2>
                        </div>
                        <div className="modal-body">
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{confirmModal.message}</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setConfirmModal({ isOpen: false, type: null, id: null, title: '', message: '' })}>
                                Yo'q
                            </button>
                            <button type="button" className={`btn ${confirmModal.type === 'delete' ? 'btn-danger' : 'btn-primary'}`} onClick={executeConfirmAction}>
                                Ha, tasdiqlayman
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
