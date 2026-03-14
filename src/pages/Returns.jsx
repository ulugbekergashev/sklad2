import { useState, useEffect } from 'react';
import { RotateCcw, Check, AlertCircle, Plus, X, Package } from 'lucide-react';

export default function Returns({ token }) {
    const [movements, setMovements] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        product_id: '', quantity: '', unit_price: '', paid_amount: '',
        counterparty_name: '', counterparty_phone: '', notes: '',
    });
    const [result, setResult] = useState(null);
    const [saving, setSaving] = useState(false);

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const fetchAll = async () => {
        try {
            const [movRes, prodRes] = await Promise.all([
                fetch('/api/movements?type=RETURN', { headers }),
                fetch('/api/products', { headers }),
            ]);
            setMovements(await movRes.json());
            setProducts(await prodRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const selectedProduct = products.find(p => p.id === parseInt(form.product_id));
    const total = (parseFloat(form.quantity || 0) * parseFloat(form.unit_price || 0));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setResult(null);

        try {
            const res = await fetch('/api/movements', {
                method: 'POST', headers,
                body: JSON.stringify({ ...form, movement_type: 'RETURN' }),
            });
            const data = await res.json();
            if (res.ok) {
                setResult({ success: true, message: 'Vozvrat muvaffaqiyatli amalga oshirildi!' });
                setForm({ product_id: '', quantity: '', unit_price: '', paid_amount: '', counterparty_name: '', counterparty_phone: '', notes: '' });
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

    const formatPrice = (val) => new Intl.NumberFormat('uz-UZ').format(val || 0);

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Vozvrat</h1>
                    <p className="page-subtitle">Jami: {movements.length} ta vozvrat</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowForm(true); setResult(null); }}>
                    <Plus size={18} /> Vozvrat qo'shish
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
                            <th>Qaytarilgan pul</th>
                            <th>Mijoz</th>
                            <th>Izoh</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movements.length === 0 ? (
                            <tr><td colSpan={9}>
                                <div className="empty-state">
                                    <RotateCcw size={48} />
                                    <h3>Vozvrat tarixi bo'sh</h3>
                                    <p>"Vozvrat qo'shish" tugmasini bosib yangi vozvrat yarating</p>
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
                                <td style={{ color: 'var(--warning)' }}>
                                    {formatPrice(m.paid_amount)} so'm
                                </td>
                                <td>{m.counterparty_name || '-'}</td>
                                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {m.notes || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Return Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Yangi vozvrat</h2>
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
                                        <label className="form-label">Sotish narxi (so'm)</label>
                                        <input className="form-input" type="number" step="any" placeholder="0" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Jami vozvrat summa:</span>
                                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatPrice(total)} so'm</span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Qaytarilgan naqd pul (mijozga berilgan bo'lsa)</label>
                                        <input className="form-input" type="number" step="any" placeholder="0" value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })} />
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                        Eslatma: Mahsulot omborga qaytadi va zaxira ko'payadi.
                                    </p>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Mijoz nomi</label>
                                        <input className="form-input" placeholder="Nomi" value={form.counterparty_name} onChange={e => setForm({ ...form, counterparty_name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Telefon</label>
                                        <input className="form-input" placeholder="+998..." value={form.counterparty_phone} onChange={e => setForm({ ...form, counterparty_phone: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Izoh</label>
                                    <textarea className="form-textarea" placeholder="Nima sababdan qaytdi?..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    <RotateCcw size={16} />
                                    {saving ? 'Saqlanmoqda...' : 'Vozvrat qilish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
