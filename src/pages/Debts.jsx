import { useState, useEffect } from 'react';
import { Landmark, CreditCard, X, Check, Plus } from 'lucide-react';

export default function Debts({ token }) {
    const [debts, setDebts] = useState([]);
    const [activeTab, setActiveTab] = useState('receivable');
    const [loading, setLoading] = useState(true);
    const [payModal, setPayModal] = useState(null);
    const [payForm, setPayForm] = useState({ amount: '', payment_method: 'naqd', notes: '' });
    const [payLoading, setPayLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ debt_type: 'receivable', counterparty_name: '', counterparty_phone: '', total_amount: '', due_date: '', description: '' });
    const [addLoading, setAddLoading] = useState(false);

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const fetchDebts = async () => {
        try {
            const res = await fetch(`/api/debts?type=${activeTab}`, { headers });
            setDebts(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchDebts();
    }, [activeTab]);

    const handlePay = async (e) => {
        e.preventDefault();
        setPayLoading(true);
        try {
            const res = await fetch(`/api/debts/${payModal.id}/pay`, {
                method: 'POST', headers,
                body: JSON.stringify(payForm),
            });
            if (res.ok) {
                setPayModal(null);
                setPayForm({ amount: '', payment_method: 'naqd', notes: '' });
                fetchDebts();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (err) {
            alert('Server xatosi');
        } finally {
            setPayLoading(false);
        }
    };

    const handleAddDebt = async (e) => {
        e.preventDefault();
        setAddLoading(true);
        try {
            const res = await fetch('/api/debts', {
                method: 'POST', headers,
                body: JSON.stringify(addForm),
            });
            if (res.ok) {
                setShowAddModal(false);
                setAddForm({ debt_type: activeTab, counterparty_name: '', counterparty_phone: '', total_amount: '', due_date: '', description: '' });
                fetchDebts();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (err) {
            alert('Server xatosi');
        } finally {
            setAddLoading(false);
        }
    };

    const formatPrice = (val) => new Intl.NumberFormat('uz-UZ').format(val || 0);

    const getStatusBadge = (status) => {
        const map = {
            active: { label: 'Aktiv', className: 'badge-warning' },
            paid: { label: 'To\'langan', className: 'badge-success' },
            overdue: { label: 'Muddati o\'tgan', className: 'badge-danger' },
        };
        const s = map[status] || map.active;
        return <span className={`badge ${s.className}`}>{s.label}</span>;
    };

    const totalRemaining = debts.reduce((s, d) => s + parseFloat(d.remaining_amount || 0), 0);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Qarzlar</h1>
                    <p className="page-subtitle">
                        {activeTab === 'receivable' ? 'Bizga berilishi kerak' : 'Biz berishimiz kerak'}: {formatPrice(totalRemaining)} so'm
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => {
                    setAddForm({ ...addForm, debt_type: activeTab });
                    setShowAddModal(true);
                }}>
                    <Plus size={18} /> Qarz qo'shish
                </button>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'receivable' ? 'active' : ''}`} onClick={() => setActiveTab('receivable')}>
                    Bizga berilishi kerak
                </button>
                <button className={`tab ${activeTab === 'payable' ? 'active' : ''}`} onClick={() => setActiveTab('payable')}>
                    Biz berishimiz kerak
                </button>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /></div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Kontragent</th>
                                <th>Tavsif</th>
                                <th>Jami</th>
                                <th>To'langan</th>
                                <th>Qoldiq</th>
                                <th>Holat</th>
                                <th>Sana</th>
                                <th>Amal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {debts.length === 0 ? (
                                <tr><td colSpan={8}>
                                    <div className="empty-state">
                                        <Landmark size={48} />
                                        <h3>Qarzlar topilmadi</h3>
                                        <p>{activeTab === 'receivable' ? 'Bizga berilishi kerak bo\'lgan qarzlar yo\'q' : 'Biz berishimiz kerak bo\'lgan qarzlar yo\'q'}</p>
                                    </div>
                                </td></tr>
                            ) : debts.map(d => (
                                <tr key={d.id}>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.counterparty_name}</div>
                                        {d.counterparty_phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.counterparty_phone}</div>}
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>{d.description || '-'}</td>
                                    <td>{formatPrice(d.total_amount)} so'm</td>
                                    <td style={{ color: 'var(--success)' }}>{formatPrice(d.paid_amount)} so'm</td>
                                    <td style={{ fontWeight: 700, color: parseFloat(d.remaining_amount) > 0 ? 'var(--warning)' : 'var(--success)' }}>
                                        {formatPrice(d.remaining_amount)} so'm
                                    </td>
                                    <td>{getStatusBadge(d.status)}</td>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {new Date(d.createdAt).toLocaleDateString('uz-UZ')}
                                    </td>
                                    <td>
                                        {d.status === 'active' && (
                                            <button className="btn btn-success btn-sm" onClick={() => {
                                                setPayModal(d);
                                                setPayForm({ amount: '', payment_method: 'naqd', notes: '' });
                                            }}>
                                                <CreditCard size={14} /> To'lov
                                            </button>
                                        )}
                                        {d.status === 'paid' && <Check size={18} color="var(--success)" />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Payment Modal */}
            {payModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title">To'lov kiritish</h2>
                            <button className="modal-close" onClick={() => setPayModal(null)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handlePay}>
                            <div className="modal-body">
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Kontragent:</span>
                                        <span style={{ fontWeight: 600 }}>{payModal.counterparty_name}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Qarz qoldig'i:</span>
                                        <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{formatPrice(payModal.remaining_amount)} so'm</span>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">To'lov summasi *</label>
                                    <input className="form-input" type="number" step="any" required
                                        placeholder={`Max: ${formatPrice(payModal.remaining_amount)}`}
                                        value={payForm.amount}
                                        onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                                        max={parseFloat(payModal.remaining_amount)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">To'lov usuli</label>
                                    <select className="form-select" value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}>
                                        <option value="naqd">Naqd pul</option>
                                        <option value="karta">Karta</option>
                                        <option value="bank">Bank o'tkazmasi</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Izoh</label>
                                    <textarea className="form-textarea" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Qo'shimcha izoh..." />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setPayModal(null)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-success" disabled={payLoading}>
                                    {payLoading ? 'Yuklanmoqda...' : 'To\'lov qilish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Debt Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title">Yangi qarz qo'shish</h2>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddDebt}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Qarz turi *</label>
                                    <select className="form-select" value={addForm.debt_type} onChange={e => setAddForm({ ...addForm, debt_type: e.target.value })}>
                                        <option value="receivable">Bizga berilishi kerak</option>
                                        <option value="payable">Biz berishimiz kerak</option>
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Kontragent nomi *</label>
                                        <input className="form-input" required value={addForm.counterparty_name} onChange={e => setAddForm({ ...addForm, counterparty_name: e.target.value })} placeholder="Ism yoki firma nomi" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Telefon</label>
                                        <input className="form-input" value={addForm.counterparty_phone} onChange={e => setAddForm({ ...addForm, counterparty_phone: e.target.value })} placeholder="+998..." />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Qarz summasi (so'm) *</label>
                                        <input className="form-input" type="number" step="any" required value={addForm.total_amount} onChange={e => setAddForm({ ...addForm, total_amount: e.target.value })} placeholder="0" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Muddat</label>
                                        <input className="form-input" type="date" value={addForm.due_date} onChange={e => setAddForm({ ...addForm, due_date: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tavsif</label>
                                    <textarea className="form-textarea" value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} placeholder="Qarz haqida tavsif..." />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                                    {addLoading ? 'Saqlanmoqda...' : 'Qarz yozish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
