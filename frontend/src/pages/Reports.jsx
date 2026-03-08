import { useState, useEffect } from 'react';
import { apiGet } from '../api';
import { BarChart3, Download, FileSpreadsheet } from 'lucide-react';

export default function Reports() {
    const [tab, setTab] = useState('movements');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [moveType, setMoveType] = useState('');
    const [catId, setCatId] = useState(0);
    const [categories, setCategories] = useState([]);
    const [movReport, setMovReport] = useState(null);
    const [stockReport, setStockReport] = useState(null);

    useEffect(() => { apiGet('/categories/').then(setCategories); }, []);

    const loadMovements = () => {
        const p = new URLSearchParams();
        if (dateFrom) p.set('date_from', dateFrom);
        if (dateTo) p.set('date_to', dateTo);
        if (moveType) p.set('movement_type', moveType);
        if (catId) p.set('category_id', catId);
        apiGet(`/reports/movements?${p}`).then(setMovReport);
    };

    const loadStock = () => {
        const p = new URLSearchParams();
        if (catId) p.set('category_id', catId);
        apiGet(`/reports/stock?${p}`).then(setStockReport);
    };

    useEffect(() => { if (tab === 'movements') loadMovements(); else loadStock(); }, [tab]);

    const exportExcel = (type) => {
        const token = localStorage.getItem('sklad_token');
        window.open(`/api/reports/export/excel?report_type=${type}&token=${token}`, '_blank');
    };

    return (<>
        <div className="page-header"><div><div className="page-title">Hisobotlar</div><div className="page-subtitle">Tahlil va statistika</div></div>
            <button className="btn btn-secondary" onClick={() => exportExcel(tab)}><Download size={16} /> Excel yuklab olish</button></div>
        <div className="page-body animate-in">
            <div className="btn-group" style={{ marginBottom: 20 }}>
                <button className={`btn ${tab === 'movements' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('movements')}>Kirim/Chiqim hisoboti</button>
                <button className={`btn ${tab === 'stock' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('stock')}>Zaxira hisoboti</button>
            </div>

            {tab === 'movements' && <>
                <div className="filter-bar">
                    <input type="date" className="form-input" style={{ width: 160 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                    <input type="date" className="form-input" style={{ width: 160 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    <select className="form-select" value={moveType} onChange={e => setMoveType(e.target.value)}>
                        <option value="">Barchasi</option><option value="IN">Kirim</option><option value="OUT">Chiqim</option>
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={loadMovements}>Filtrlash</button>
                </div>

                {movReport && <>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
                        <div className="stat-card" style={{ '--stat-color': '#22c55e' }}><div className="stat-value">{movReport.summary.total_in}</div><div className="stat-label">Jami kirim (dona)</div></div>
                        <div className="stat-card" style={{ '--stat-color': '#ef4444' }}><div className="stat-value">{movReport.summary.total_out}</div><div className="stat-label">Jami chiqim (dona)</div></div>
                        <div className="stat-card" style={{ '--stat-color': '#6366f1' }}><div className="stat-value">{movReport.summary.total_in_value.toLocaleString()}</div><div className="stat-label">Kirim qiymati (so'm)</div></div>
                        <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}><div className="stat-value">{movReport.summary.total_out_value.toLocaleString()}</div><div className="stat-label">Chiqim qiymati (so'm)</div></div>
                    </div>
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>Sana</th><th>Mahsulot</th><th>Turi</th><th>Miqdor</th><th>Narx</th><th>Jami</th><th>Yetkazuvchi</th></tr></thead>
                        <tbody>{movReport.items.length === 0 ? <tr><td colSpan={7} className="table-empty">Ma'lumot yo'q</td></tr> :
                            movReport.items.map((m, i) => <tr key={i}><td style={{ fontSize: '0.8rem' }}>{m.created_at ? new Date(m.created_at).toLocaleDateString('uz-UZ') : ''}</td>
                                <td style={{ fontWeight: 600 }}>{m.product_name}</td><td><span className={`cell-badge ${m.movement_type === 'IN' ? 'badge-in' : 'badge-out'}`}>{m.movement_type === 'IN' ? 'Kirim' : 'Chiqim'}</span></td>
                                <td>{m.quantity}</td><td>{m.unit_price?.toLocaleString()}</td><td style={{ fontWeight: 600 }}>{m.total?.toLocaleString()}</td>
                                <td>{m.supplier_name || '—'}</td></tr>)}</tbody></table></div>
                </>}
            </>}

            {tab === 'stock' && <>
                <div className="filter-bar">
                    <select className="form-select" value={catId} onChange={e => { setCatId(Number(e.target.value)); setTimeout(loadStock, 100); }}>
                        <option value={0}>Barcha kategoriya</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                {stockReport && <>
                    <div className="stat-card" style={{ marginBottom: 20, '--stat-color': '#8b5cf6', maxWidth: 300 }}>
                        <div className="stat-value">{stockReport.total_value?.toLocaleString()} so'm</div><div className="stat-label">Umumiy zaxira qiymati</div></div>
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>Mahsulot</th><th>SKU</th><th>Kategoriya</th><th>Zaxira</th><th>Min.</th><th>Narx</th><th>Qiymat</th><th>Holat</th></tr></thead>
                        <tbody>{stockReport.items.map((p, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{p.name}</td><td className="cell-mono">{p.sku}</td>
                            <td>{p.category || '—'}</td><td>{p.current_stock} {p.unit}</td><td>{p.min_stock}</td><td>{p.price?.toLocaleString()}</td>
                            <td style={{ fontWeight: 600 }}>{p.value?.toLocaleString()}</td>
                            <td><span className={`cell-badge ${p.status === 'low' ? 'badge-low' : 'badge-ok'}`}>{p.status === 'low' ? 'Kam' : 'OK'}</span></td></tr>)}</tbody></table></div>
                </>}
            </>}
        </div></>);
}
