import { useState, useEffect } from 'react';
import { ArrowDownToLine, Check, AlertCircle, Plus, X, Package } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Incoming({ token }) {
    const location = useLocation();
    const [movements, setMovements] = useState([]);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // URL dan product_id ni tekshirish
    const queryParams = new URLSearchParams(location.search);
    const initialProductId = queryParams.get('product_id') || '';
    
    const [form, setForm] = useState({
        product_id: initialProductId, quantity: '', unit_price: '', paid_amount: '',
        counterparty_name: '', counterparty_phone: '', supplier_id: '', notes: '',
    });
    const [result, setResult] = useState(null);
    const [saving, setSaving] = useState(false);

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const fetchAll = async () => {
        try {
            const [movRes, prodRes, supRes] = await Promise.all([
                fetch('/api/movements?type=IN', { headers }),
                fetch('/api/products', { headers }),
                fetch('/api/suppliers', { headers }),
            ]);
            setMovements(await movRes.json());
            setProducts(await prodRes.json());
            setSuppliers(await supRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchAll(); 
        if (initialProductId) {
            setShowForm(true);
        }
    }, []);

    // Mahsulotlar yuklangandan keyin unit_price ni to'g'irlash (faqat initialProductId bo'lsa)
    useEffect(() => {
        if (initialProductId && products.length > 0) {
            const p = products.find(x => x.id === parseInt(initialProductId));
            if (p) {
                setForm(prev => ({ ...prev, unit_price: p.price }));
            }
        }
    }, [products, initialProductId]);

    const total = (parseFloat(form.quantity || 0) * parseFloat(form.unit_price || 0));
    const debtAmount = Math.max(0, total - parseFloat(form.paid_amount || 0));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setResult(null);

        try {
            const res = await fetch('/api/movements', {
                method: 'POST', headers,
                body: JSON.stringify({ ...form, movement_type: 'IN' }),
            });
            const data = await res.json();
            if (res.ok) {
                setResult({ success: true, message: 'Kirim muvaffaqiyatli amalga oshirildi!', debt: data.debt });
                setForm({ product_id: '', quantity: '', unit_price: '', paid_amount: '', counterparty_name: '', counterparty_phone: '', supplier_id: '', notes: '' });
                setShowForm(false);
                fetchAll();
            } else {
                setResult({ success: false, message: data.error });
            }
        } catch (err) {
            setResult({ success: false, message: 'Server xatosi' });
        } finally {
            setSaving(false);
        }
    };

    const formatPrice = (val) => new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(val || 0);

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Kirim</h1>
                    <p className="page-subtitle">Jami: {movements.length} ta kirim</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowForm(true); setResult(null); }}>
                    <Plus size={18} /> Kirim qo'shish
                </button>
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
                        <div>
                            <div style={{ fontWeight: 600, color: result.success ? 'var(--success)' : 'var(--danger)' }}>
                                {result.message}
                            </div>
                            {result.debt && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: '4px' }}>
                                    ⚠️ {result.debt.counterparty_name} ga {formatPrice(result.debt.remaining_amount)} so'm qarz yozildi
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Movements History Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Sana</th>
                            <th>Mahsulot</th>
                            <th>Miqdor</th>
                            <th>Narxi</th>
                            <th>Jami</th>
                            <th>To'langan</th>
                            <th>Kontragent</th>
                            <th>Izoh</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movements.length === 0 ? (
                            <tr><td colSpan={9}>
                                <div className="empty-state">
                                    <ArrowDownToLine size={48} />
                                    <h3>Kirim tarixi bo'sh</h3>
                                    <p>"Kirim qo'shish" tugmasini bosib yangi kirim yarating</p>
                                </div>
                            </td></tr>
                        ) : movements.map((m, i) => (
                            <tr key={m.id}>
                                <td>{i + 1}</td>
                                <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                    {new Date(m.createdAt).toLocaleString('uz-UZ')}
                                </td>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {m.product?.name || '-'}
                                </td>
                                <td>{parseFloat(m.quantity)} {m.product?.unit || ''}</td>
                                <td>{formatPrice(m.unit_price)} so'm</td>
                                <td style={{ fontWeight: 600 }}>{formatPrice(m.total_amount)} so'm</td>
                                <td style={{ color: parseFloat(m.paid_amount) < parseFloat(m.total_amount) ? 'var(--warning)' : 'var(--success)' }}>
                                    {formatPrice(m.paid_amount)} so'm
                                </td>
                                <td>{m.counterparty_name || m.supplier?.name || '-'}</td>
                                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {m.notes || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Summary */}
                {movements.length > 0 && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '32px', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                            Jami: <strong style={{ color: 'var(--text-primary)' }}>{movements.length}</strong> ta kirim
                        </span>
                        <span style={{ color: 'var(--success)' }}>
                            Summa: <strong>{formatPrice(movements.reduce((s, m) => s + parseFloat(m.total_amount || 0), 0))}</strong> so'm
                        </span>
                    </div>
                )}
            </div>

            {/* Add Incoming Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Yangi kirim</h2>
                            <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Mahsulot *</label>
                                    <select className="form-select" required value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value, unit_price: products.find(p => p.id === parseInt(e.target.value))?.price || '' })}>
                                        <option value="">Mahsulotni tanlang</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku}) — qoldiq: {parseFloat(p.current_stock)} {p.unit}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Miqdori *</label>
                                        <input className="form-input" type="number" step="any" required placeholder="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Bir dona narxi (so'm)</label>
                                        <input className="form-input" type="number" step="any" placeholder="0" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
                                    </div>
                                </div>

                                {/* Total & Payment */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Jami summa:</span>
                                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatPrice(total)} so'm</span>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '12px' }}>
                                        <label className="form-label">To'langan summa</label>
                                        <input className="form-input" type="number" step="any" placeholder="0" value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })} />
                                    </div>
                                    {debtAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning)', fontWeight: 600 }}>
                                            <span>Qarz miqdori:</span>
                                            <span>{formatPrice(debtAmount)} so'm</span>
                                        </div>
                                    )}
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Yetkazib beruvchi nomi</label>
                                        <input className="form-input" placeholder="Nomi" value={form.counterparty_name} onChange={e => setForm({ ...form, counterparty_name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Telefon</label>
                                        <input className="form-input" placeholder="+998..." value={form.counterparty_phone} onChange={e => setForm({ ...form, counterparty_phone: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Izoh</label>
                                    <textarea className="form-textarea" placeholder="Qo'shimcha izoh..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    <ArrowDownToLine size={16} />
                                    {saving ? 'Saqlanmoqda...' : 'Kirim qilish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
