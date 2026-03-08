import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api';
import { ArrowUpFromLine, Plus, Package, AlertTriangle } from 'lucide-react';

export default function Outgoing() {
    const [movements, setMovements] = useState([]);
    const [products, setProducts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ product_id: '', quantity: 1, unit_price: 0, reference_number: '', notes: '', paid_amount: '', counterparty_name: '', counterparty_phone: '' });
    const [selectedProduct, setSelectedProduct] = useState(null);

    const load = () => { apiGet('/movements/?movement_type=OUT&limit=100').then(setMovements).catch(console.error); };
    useEffect(() => {
        load();
        apiGet('/products/').then(setProducts).catch(console.error);
    }, []);

    const handleProductChange = (pid) => {
        const prod = products.find(p => p.id === Number(pid)) || null;
        setForm({ ...form, product_id: pid, unit_price: prod?.price || 0 });
        setSelectedProduct(prod);
    };

    const totalAmount = Number(form.quantity) * Number(form.unit_price);
    const paidAmount = form.paid_amount === '' ? null : Number(form.paid_amount);
    const debtAmount = paidAmount !== null && paidAmount < totalAmount ? totalAmount - paidAmount : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiPost('/movements/', {
                movement_type: 'OUT',
                product_id: Number(form.product_id),
                quantity: Number(form.quantity),
                unit_price: Number(form.unit_price),
                reference_number: form.reference_number,
                notes: form.notes,
                paid_amount: paidAmount,
                counterparty_name: form.counterparty_name || undefined,
                counterparty_phone: form.counterparty_phone || undefined,
            });
            setShowForm(false);
            setForm({ product_id: '', quantity: 1, unit_price: 0, reference_number: '', notes: '', paid_amount: '', counterparty_name: '', counterparty_phone: '' });
            setSelectedProduct(null);
            load();
            apiGet('/products/').then(setProducts).catch(console.error);
        } catch (err) { alert(err.message); }
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-title">Chiqim</div>
                    <div className="page-subtitle">Mahsulot chiqarish</div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    <Plus size={16} /> Yangi chiqim
                </button>
            </div>

            <div className="page-body animate-in">
                {showForm && (
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header"><h3>Yangi chiqim rasmiylash</h3></div>
                        <form onSubmit={handleSubmit}>
                            <div className="card-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Mahsulot *</label>
                                        <select className="form-select" value={form.product_id} onChange={e => handleProductChange(e.target.value)} required>
                                            <option value="">Tanlang</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — zaxira: {p.current_stock}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        {selectedProduct && (
                                            <div style={{ marginTop: 24, padding: '10px 14px', background: selectedProduct.current_stock <= selectedProduct.min_stock ? 'var(--warning-bg)' : 'var(--success-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
                                                <strong>Mavjud zaxira:</strong> {selectedProduct.current_stock} {selectedProduct.unit}
                                                {selectedProduct.current_stock <= selectedProduct.min_stock && (
                                                    <div style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                        <AlertTriangle size={14} /> Zaxira kam!
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="form-row-3">
                                    <div className="form-group">
                                        <label className="form-label">Miqdor *</label>
                                        <input className="form-input" type="number" min={1} max={selectedProduct?.current_stock || 99999} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Birlik narx</label>
                                        <input className="form-input" type="number" min={0} value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Hujjat raqami</label>
                                        <input className="form-input" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} placeholder="OUT-001" />
                                    </div>
                                </div>

                                {/* To'lov bo'limi */}
                                {form.product_id && (
                                    <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginTop: 8, marginBottom: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
                                            <span>Jami summa:</span>
                                            <strong>{totalAmount.toLocaleString()} so'm</strong>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">To'langan miqdor (so'm)</label>
                                                <input className="form-input" type="number" min={0} max={totalAmount}
                                                    value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })}
                                                    placeholder={`${totalAmount.toLocaleString()} (to'liq)`} />
                                            </div>
                                        </div>
                                        {debtAmount > 0 && (
                                            <div className="form-row" style={{ marginTop: 8 }}>
                                                <div className="form-group">
                                                    <label className="form-label">Mijoz ismi (qarzdor)</label>
                                                    <input className="form-input" value={form.counterparty_name}
                                                        onChange={e => setForm({ ...form, counterparty_name: e.target.value })}
                                                        placeholder="Ism kiritng..." />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Telefon raqami</label>
                                                    <input className="form-input" value={form.counterparty_phone}
                                                        onChange={e => setForm({ ...form, counterparty_phone: e.target.value })}
                                                        placeholder="+998..." />
                                                </div>
                                            </div>
                                        )}
                                        {debtAmount > 0 && (
                                            <div style={{ padding: '8px 12px', background: 'var(--warning-bg)', borderRadius: 6, fontSize: '0.82rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <AlertTriangle size={14} />
                                                Qarz: <strong>{debtAmount.toLocaleString()} so'm</strong> — avtomatik qarzdorlik yaratiladi
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Izoh</label>
                                    <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ padding: '0 20px 16px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-danger"><ArrowUpFromLine size={16} /> Chiqim qilish</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Sana</th>
                                <th>Mahsulot</th>
                                <th>SKU</th>
                                <th>Miqdor</th>
                                <th>Narx</th>
                                <th>Jami</th>
                                <th>Hujjat</th>
                                <th>Izoh</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.length === 0 ? (
                                <tr><td colSpan={8} className="table-empty"><Package size={40} /><div>Chiqimlar yo'q</div></td></tr>
                            ) : movements.map(m => (
                                <tr key={m.id}>
                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.created_at ? new Date(m.created_at).toLocaleString('uz-UZ') : ''}</td>
                                    <td style={{ fontWeight: 600 }}>{m.product_name}</td>
                                    <td className="cell-mono">{m.product_sku}</td>
                                    <td><span className="cell-badge badge-out">-{m.quantity}</span></td>
                                    <td>{m.unit_price?.toLocaleString()} so'm</td>
                                    <td style={{ fontWeight: 600 }}>{(m.quantity * m.unit_price).toLocaleString()} so'm</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{m.reference_number || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)', maxWidth: 200 }} className="truncate">{m.notes || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
