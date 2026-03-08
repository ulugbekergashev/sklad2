import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api';
import { ArrowDownToLine, Plus, Search, Package, AlertTriangle } from 'lucide-react';

export default function Incoming() {
    const [movements, setMovements] = useState([]);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ product_id: '', quantity: 1, unit_price: 0, supplier_id: '', reference_number: '', notes: '', paid_amount: '', counterparty_name: '', counterparty_phone: '' });

    const load = () => { apiGet('/movements/?movement_type=IN&limit=100').then(setMovements).catch(console.error); };
    useEffect(() => {
        load();
        apiGet('/products/').then(setProducts).catch(console.error);
        apiGet('/suppliers/').then(setSuppliers).catch(console.error);
    }, []);

    const totalAmount = Number(form.quantity) * Number(form.unit_price);
    const paidAmount = form.paid_amount === '' ? null : Number(form.paid_amount);
    const debtAmount = paidAmount !== null && paidAmount < totalAmount ? totalAmount - paidAmount : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiPost('/movements/', {
                movement_type: 'IN',
                product_id: Number(form.product_id),
                quantity: Number(form.quantity),
                unit_price: Number(form.unit_price),
                supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
                reference_number: form.reference_number,
                notes: form.notes,
                paid_amount: paidAmount,
                counterparty_name: form.counterparty_name || undefined,
                counterparty_phone: form.counterparty_phone || undefined,
            });
            setShowForm(false);
            setForm({ product_id: '', quantity: 1, unit_price: 0, supplier_id: '', reference_number: '', notes: '', paid_amount: '', counterparty_name: '', counterparty_phone: '' });
            load();
        } catch (err) { alert(err.message); }
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-title">Kirim</div>
                    <div className="page-subtitle">Mahsulot qabul qilish</div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    <Plus size={16} /> Yangi kirim
                </button>
            </div>

            <div className="page-body animate-in">
                {showForm && (
                    <div className="card mb-16" style={{ marginBottom: 20 }}>
                        <div className="card-header"><h3>Yangi kirim qo'shish</h3></div>
                        <form onSubmit={handleSubmit}>
                            <div className="card-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Mahsulot *</label>
                                        <select className="form-select" value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} required>
                                            <option value="">Tanlang</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Yetkazib beruvchi</label>
                                        <select className="form-select" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}>
                                            <option value="">Tanlang</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row-3">
                                    <div className="form-group">
                                        <label className="form-label">Miqdor *</label>
                                        <input className="form-input" type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Birlik narx</label>
                                        <input className="form-input" type="number" min={0} value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Hujjat raqami</label>
                                        <input className="form-input" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} placeholder="INV-001" />
                                    </div>
                                </div>

                                {/* To'lov bo'limi */}
                                {form.product_id && (
                                    <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginTop: 8, marginBottom: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
                                            <span>Jami summa:</span>
                                            <strong>{totalAmount.toLocaleString()} so'm</strong>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">To'langan miqdor (so'm)</label>
                                            <input className="form-input" type="number" min={0} max={totalAmount}
                                                value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })}
                                                placeholder={`${totalAmount.toLocaleString()} (to'liq)`} />
                                        </div>
                                        {debtAmount > 0 && (
                                            <div className="form-row" style={{ marginTop: 8 }}>
                                                <div className="form-group">
                                                    <label className="form-label">Qarzdor ismi</label>
                                                    <input className="form-input" value={form.counterparty_name}
                                                        onChange={e => setForm({ ...form, counterparty_name: e.target.value })}
                                                        placeholder="Yetkazuvchi ismi..." />
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
                                                Bizning qarzimiz: <strong>{debtAmount.toLocaleString()} so'm</strong> — avtomatik qarzdorlik yaratiladi
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
                                <button type="submit" className="btn btn-success"><ArrowDownToLine size={16} /> Kirim qilish</button>
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
                                <th>Yetkazuvchi</th>
                                <th>Hujjat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.length === 0 ? (
                                <tr><td colSpan={8} className="table-empty"><Package size={40} /><div>Kirimlar yo'q</div></td></tr>
                            ) : movements.map(m => (
                                <tr key={m.id}>
                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.created_at ? new Date(m.created_at).toLocaleString('uz-UZ') : ''}</td>
                                    <td style={{ fontWeight: 600 }}>{m.product_name}</td>
                                    <td className="cell-mono">{m.product_sku}</td>
                                    <td><span className="cell-badge badge-in">+{m.quantity}</span></td>
                                    <td>{m.unit_price?.toLocaleString()} so'm</td>
                                    <td style={{ fontWeight: 600 }}>{(m.quantity * m.unit_price).toLocaleString()} so'm</td>
                                    <td>{m.supplier_name || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{m.reference_number || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
