import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '../api';
import Modal from '../components/Modal';
import { Plus, Search, Trash2, CreditCard, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Phone } from 'lucide-react';

export default function Debts() {
    const [debts, setDebts] = useState([]);
    const [stats, setStats] = useState(null);
    const [tab, setTab] = useState('all');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [payModal, setPayModal] = useState(null);
    const [form, setForm] = useState({
        debt_type: 'receivable', counterparty_name: '', counterparty_phone: '',
        total_amount: '', description: '', due_date: '',
    });
    const [payForm, setPayForm] = useState({ amount: '', payment_method: 'naqd', notes: '' });

    const load = () => {
        const p = new URLSearchParams();
        if (tab !== 'all') p.set('debt_type', tab);
        if (statusFilter) p.set('status', statusFilter);
        if (search) p.set('search', search);
        apiGet(`/debts/?${p}`).then(setDebts).catch(console.error);
        apiGet('/debts/stats').then(setStats).catch(console.error);
    };

    useEffect(() => { load(); }, [tab, statusFilter, search]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await apiPost('/debts/', {
                ...form,
                total_amount: Number(form.total_amount),
                due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
            });
            setShowModal(false);
            setForm({ debt_type: 'receivable', counterparty_name: '', counterparty_phone: '', total_amount: '', description: '', due_date: '' });
            load();
        } catch (err) { alert(err.message); }
    };

    const handlePay = async (e) => {
        e.preventDefault();
        try {
            await apiPost(`/debts/${payModal.id}/payments`, {
                amount: Number(payForm.amount),
                payment_method: payForm.payment_method,
                notes: payForm.notes,
            });
            setPayModal(null);
            setPayForm({ amount: '', payment_method: 'naqd', notes: '' });
            load();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Qarzni o'chirmoqchimisiz?")) return;
        try { await apiDelete(`/debts/${id}`); load(); } catch (err) { alert(err.message); }
    };

    const fmt = (n) => Number(n || 0).toLocaleString('uz-UZ');

    const statusBadge = (s) => {
        if (s === 'paid') return <span className="cell-badge badge-ok">To'langan</span>;
        if (s === 'overdue') return <span className="cell-badge badge-low">Muddati o'tgan</span>;
        return <span className="cell-badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>Faol</span>;
    };

    return (<>
        <div className="page-header">
            <div>
                <div className="page-title">Qarzdorliklar</div>
                <div className="page-subtitle">Debitor va kreditor nazorati</div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={16} /> Yangi qarz
            </button>
        </div>

        <div className="page-body animate-in">
            {/* Stats */}
            {stats && (
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
                    <div className="stat-card" style={{ '--stat-color': '#22c55e' }}>
                        <div className="stat-icon"><TrendingUp size={20} /></div>
                        <div className="stat-value">{fmt(stats.total_receivable)}</div>
                        <div className="stat-label">Bizga qarzdorlar ({stats.receivable_count})</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-color': '#ef4444' }}>
                        <div className="stat-icon"><TrendingDown size={20} /></div>
                        <div className="stat-value">{fmt(stats.total_payable)}</div>
                        <div className="stat-label">Bizning qarzlarimiz ({stats.payable_count})</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
                        <div className="stat-icon"><AlertTriangle size={20} /></div>
                        <div className="stat-value">{fmt(stats.overdue_receivable + stats.overdue_payable)}</div>
                        <div className="stat-label">Muddati o'tgan ({stats.overdue_count})</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-color': '#6366f1' }}>
                        <div className="stat-icon"><DollarSign size={20} /></div>
                        <div className="stat-value">{fmt(stats.total_receivable - stats.total_payable)}</div>
                        <div className="stat-label">Sof balans</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="table-wrapper">
                <div className="table-toolbar">
                    <div className="btn-group" style={{ flex: 0 }}>
                        {[{ id: 'all', l: 'Barchasi' }, { id: 'receivable', l: 'Bizga qarzdorlar' }, { id: 'payable', l: 'Bizning qarzlarimiz' }].map(t =>
                            <button key={t.id} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setTab(t.id)}>{t.l}</button>
                        )}
                    </div>
                    <select className="form-select" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">Barcha holat</option>
                        <option value="active">Faol</option>
                        <option value="overdue">Muddati o'tgan</option>
                        <option value="paid">To'langan</option>
                    </select>
                    <div className="search-box" style={{ flex: 1 }}>
                        <Search size={16} className="search-icon" />
                        <input placeholder="Qidiruv..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Turi</th>
                            <th>Ism / Kompaniya</th>
                            <th>Telefon</th>
                            <th>Jami summa</th>
                            <th>To'langan</th>
                            <th>Qoldiq</th>
                            <th>Muddat</th>
                            <th>Holat</th>
                            <th style={{ width: 100 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {debts.length === 0 ? (
                            <tr><td colSpan={9} className="table-empty">
                                <DollarSign size={40} /><div>Qarzdorliklar topilmadi</div>
                            </td></tr>
                        ) : debts.map(d => (
                            <tr key={d.id}>
                                <td>
                                    <span className={`cell-badge ${d.debt_type === 'receivable' ? 'badge-in' : 'badge-out'}`}>
                                        {d.debt_type === 'receivable' ? 'Bizga qarzdor' : 'Biz qarzdormiz'}
                                    </span>
                                </td>
                                <td style={{ fontWeight: 600 }}>{d.counterparty_name}</td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                    {d.counterparty_phone ? <><Phone size={12} style={{ marginRight: 4 }} />{d.counterparty_phone}</> : '—'}
                                </td>
                                <td>{fmt(d.total_amount)} so'm</td>
                                <td style={{ color: 'var(--success)' }}>{fmt(d.paid_amount)}</td>
                                <td style={{ fontWeight: 700, color: d.remaining_amount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                    {fmt(d.remaining_amount)} so'm
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {d.due_date ? new Date(d.due_date).toLocaleDateString('uz-UZ') : '—'}
                                </td>
                                <td>{statusBadge(d.status)}</td>
                                <td>
                                    <div className="btn-group">
                                        {d.status !== 'paid' && (
                                            <button className="btn btn-ghost btn-sm btn-icon" title="To'lov qilish"
                                                onClick={() => { setPayModal(d); setPayForm({ amount: '', payment_method: 'naqd', notes: '' }); }}>
                                                <CreditCard size={14} />
                                            </button>
                                        )}
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(d.id)}>
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

        {/* Yangi qarz modali */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Yangi qarz qo'shish">
            <form onSubmit={handleCreate}>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Qarz turi *</label>
                        <select className="form-select" value={form.debt_type} onChange={e => setForm({ ...form, debt_type: e.target.value })}>
                            <option value="receivable">Bizga qarzdor (oluvchi to'lamagan)</option>
                            <option value="payable">Biz qarzdormiz (yetkazuvchiga to'lamaganmiz)</option>
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Ism / Kompaniya *</label>
                            <input className="form-input" value={form.counterparty_name} onChange={e => setForm({ ...form, counterparty_name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Telefon</label>
                            <input className="form-input" value={form.counterparty_phone} onChange={e => setForm({ ...form, counterparty_phone: e.target.value })} placeholder="+998..." />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Summa (so'm) *</label>
                            <input className="form-input" type="number" min={1} value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Muddat</label>
                            <input className="form-input" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Izoh</label>
                        <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor</button>
                    <button type="submit" className="btn btn-primary">Qo'shish</button>
                </div>
            </form>
        </Modal>

        {/* To'lov modali */}
        <Modal isOpen={!!payModal} onClose={() => setPayModal(null)} title={`To'lov — ${payModal?.counterparty_name}`}>
            {payModal && (
                <form onSubmit={handlePay}>
                    <div className="modal-body">
                        <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 16, fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>Jami qarz:</span><strong>{fmt(payModal.total_amount)} so'm</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>To'langan:</span><span style={{ color: 'var(--success)' }}>{fmt(payModal.paid_amount)} so'm</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                <span>Qoldiq:</span><span style={{ color: 'var(--danger)' }}>{fmt(payModal.remaining_amount)} so'm</span>
                            </div>
                        </div>

                        {/* To'lovlar tarixi */}
                        {payModal.payments && payModal.payments.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <label className="form-label" style={{ marginBottom: 8 }}>To'lovlar tarixi</label>
                                {payModal.payments.map((p, i) => (
                                    <div key={i} style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: 6, marginBottom: 4, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span>{new Date(p.created_at).toLocaleDateString('uz-UZ')} — {p.payment_method}</span>
                                        <strong style={{ color: 'var(--success)' }}>+{fmt(p.amount)} so'm</strong>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">To'lov miqdori (so'm) *</label>
                                <input className="form-input" type="number" min={1} max={payModal.remaining_amount}
                                    value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">To'lov usuli</label>
                                <select className="form-select" value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}>
                                    <option value="naqd">Naqd</option>
                                    <option value="karta">Karta</option>
                                    <option value="bank">Bank o'tkazmasi</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Izoh</label>
                            <input className="form-input" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setPayModal(null)}>Bekor</button>
                        <button type="submit" className="btn btn-primary"><CreditCard size={14} /> To'lash</button>
                    </div>
                </form>
            )}
        </Modal>
    </>);
}
