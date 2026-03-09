import { useState, useEffect } from 'react';
import { FileBarChart, Download, Search, Filter } from 'lucide-react';

export default function Reports({ token }) {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        from: '', to: '', type: '',
    });

    const headers = { Authorization: `Bearer ${token}` };

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.from) params.set('from', filters.from);
            if (filters.to) params.set('to', filters.to);
            if (filters.type) params.set('type', filters.type);
            const res = await fetch(`/api/reports/movements?${params}`, { headers });
            setMovements(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMovements(); }, []);

    const handleFilter = (e) => {
        e.preventDefault();
        fetchMovements();
    };

    const exportExcel = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.from) params.set('from', filters.from);
            if (filters.to) params.set('to', filters.to);
            if (filters.type) params.set('type', filters.type);

            const res = await fetch(`/api/reports/export?${params}`, { headers });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sklad_hisobot.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Eksport qilishda xatolik');
        }
    };

    // Quick date helpers
    const setQuickDate = (days) => {
        const to = new Date().toISOString().split('T')[0];
        const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
        setFilters(prev => ({ ...prev, from, to }));
    };

    const formatPrice = (val) => new Intl.NumberFormat('uz-UZ').format(val || 0);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Hisobotlar</h1>
                    <p className="page-subtitle">Kirim-chiqim tarixi va hisobotlar</p>
                </div>
                <button className="btn btn-primary" onClick={exportExcel}>
                    <Download size={18} /> Excel yuklab olish
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card" style={{ marginBottom: '24px' }}>
                <form onSubmit={handleFilter}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Boshlanish sanasi</label>
                            <input className="form-input" type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Tugash sanasi</label>
                            <input className="form-input" type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Turi</label>
                            <select className="form-select" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
                                <option value="">Barchasi</option>
                                <option value="IN">Kirim</option>
                                <option value="OUT">Chiqim</option>
                            </select>
                        </div>
                        <button type="submit" className="btn btn-secondary">
                            <Filter size={16} /> Filtrlash
                        </button>
                    </div>

                    {/* Quick date buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuickDate(7)}>7 kun</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuickDate(30)}>30 kun</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuickDate(90)}>90 kun</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilters({ from: '', to: '', type: '' })}>Tozalash</button>
                    </div>
                </form>
            </div>

            {/* Results */}
            {loading ? (
                <div className="loading-spinner"><div className="spinner" /></div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>№</th>
                                <th>Sana</th>
                                <th>Mahsulot</th>
                                <th>Turi</th>
                                <th>Miqdor</th>
                                <th>Narx</th>
                                <th>Jami</th>
                                <th>To'langan</th>
                                <th>Kontragent</th>
                                <th>Xodim</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.length === 0 ? (
                                <tr><td colSpan={10}>
                                    <div className="empty-state">
                                        <FileBarChart size={48} />
                                        <h3>Tranzaksiyalar topilmadi</h3>
                                        <p>Filtrlarni o'zgartirib ko'ring</p>
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
                                    <td>
                                        <span className={`badge ${m.movement_type === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                                            {m.movement_type === 'IN' ? 'Kirim' : 'Chiqim'}
                                        </span>
                                    </td>
                                    <td>{parseFloat(m.quantity)} {m.product?.unit}</td>
                                    <td>{formatPrice(m.unit_price)}</td>
                                    <td style={{ fontWeight: 600 }}>{formatPrice(m.total_amount)}</td>
                                    <td style={{ color: 'var(--success)' }}>{formatPrice(m.paid_amount)}</td>
                                    <td>{m.counterparty_name || '-'}</td>
                                    <td style={{ fontSize: '0.85rem' }}>{m.creator?.full_name || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Summary */}
                    {movements.length > 0 && (
                        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '32px', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>
                                Jami: <strong style={{ color: 'var(--text-primary)' }}>{movements.length}</strong> ta tranzaksiya
                            </span>
                            <span style={{ color: 'var(--success)' }}>
                                Kirim: <strong>{formatPrice(movements.filter(m => m.movement_type === 'IN').reduce((s, m) => s + parseFloat(m.total_amount), 0))}</strong> so'm
                            </span>
                            <span style={{ color: 'var(--danger)' }}>
                                Chiqim: <strong>{formatPrice(movements.filter(m => m.movement_type === 'OUT').reduce((s, m) => s + parseFloat(m.total_amount), 0))}</strong> so'm
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
