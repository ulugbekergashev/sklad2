import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api';
import { ClipboardCheck, Plus, Check, Package } from 'lucide-react';

export default function Inventory() {
    const [checks, setChecks] = useState([]);
    const [products, setProducts] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [items, setItems] = useState([]);
    const [viewCheck, setViewCheck] = useState(null);

    const load = () => apiGet('/inventory/').then(setChecks).catch(console.error);
    useEffect(() => { load(); apiGet('/products/').then(setProducts); }, []);

    const startNew = () => {
        setItems(products.map(p => ({ product_id: p.id, product_name: p.name, product_sku: p.sku, system_quantity: p.current_stock, actual_quantity: p.current_stock, notes: '' })));
        setShowNew(true);
    };

    const updateItem = (i, f, v) => { const u = [...items]; u[i] = { ...u[i], [f]: f === 'notes' ? v : Number(v) }; setItems(u); };

    const handleSubmit = async () => {
        try {
            await apiPost('/inventory/', { items: items.map(i => ({ product_id: i.product_id, actual_quantity: i.actual_quantity, notes: i.notes })) });
            setShowNew(false); load();
        } catch (err) { alert(err.message); }
    };

    const completeCheck = async (id) => {
        if (!confirm("Yakunlash?")) return;
        try { await apiPost(`/inventory/${id}/complete`, {}); load(); setViewCheck(null); } catch (e) { alert(e.message); }
    };

    const ItemsTable = ({ data, editable }) => (
        <table className="data-table"><thead><tr><th>Mahsulot</th><th>SKU</th><th>Tizimda</th><th>Haqiqiy</th><th>Farq</th><th>Izoh</th></tr></thead>
            <tbody>{data.map((it, idx) => {
                const d = (editable ? it.actual_quantity : it.actual_quantity) - it.system_quantity;
                return (<tr key={it.product_id || it.id}><td style={{ fontWeight: 600 }}>{it.product_name}</td><td className="cell-mono">{it.product_sku}</td><td>{it.system_quantity}</td>
                    <td>{editable ? <input className="form-input" type="number" min={0} value={it.actual_quantity} onChange={e => updateItem(idx, 'actual_quantity', e.target.value)} style={{ width: 90, padding: '4px 8px' }} /> : it.actual_quantity}</td>
                    <td><span className={`cell-badge ${d > 0 ? 'badge-in' : d < 0 ? 'badge-out' : 'badge-ok'}`}>{d > 0 ? '+' : ''}{d}</span></td>
                    <td>{editable ? <input className="form-input" value={it.notes} onChange={e => updateItem(idx, 'notes', e.target.value)} style={{ padding: '4px 8px', minWidth: 100 }} /> : (it.notes || '—')}</td></tr>);
            })}</tbody></table>
    );

    return (<>
        <div className="page-header"><div><div className="page-title">Inventarizatsiya</div><div className="page-subtitle">Zaxirani tekshirish</div></div>
            <button className="btn btn-primary" onClick={startNew}><Plus size={16} /> Yangi tekshirish</button></div>
        <div className="page-body animate-in">
            {showNew && <div className="card" style={{ marginBottom: 20 }}><div className="card-header"><h3>Yangi inventarizatsiya</h3>
                <div className="btn-group"><button className="btn btn-secondary btn-sm" onClick={() => setShowNew(false)}>Bekor</button><button className="btn btn-primary btn-sm" onClick={handleSubmit}><Check size={14} /> Saqlash</button></div></div>
                <div style={{ overflowX: 'auto' }}><ItemsTable data={items} editable /></div></div>}

            {viewCheck && <div className="card" style={{ marginBottom: 20 }}><div className="card-header"><h3>#{viewCheck.id} — {viewCheck.status === 'completed' ? 'Yakunlangan' : 'Jarayonda'}</h3>
                <div className="btn-group"><button className="btn btn-secondary btn-sm" onClick={() => setViewCheck(null)}>Yopish</button>
                    {viewCheck.status !== 'completed' && <button className="btn btn-success btn-sm" onClick={() => completeCheck(viewCheck.id)}><Check size={14} /> Yakunlash</button>}</div></div>
                <ItemsTable data={viewCheck.items || []} /></div>}

            <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Sana</th><th>Holat</th><th>Tekshiruvchi</th><th>Mahsulotlar</th><th></th></tr></thead>
                <tbody>{checks.length === 0 ? <tr><td colSpan={6} className="table-empty"><ClipboardCheck size={40} /><div>Tekshirish yo'q</div></td></tr> :
                    checks.map(c => <tr key={c.id}><td>#{c.id}</td><td style={{ fontSize: '0.8rem' }}>{c.created_at ? new Date(c.created_at).toLocaleString('uz-UZ') : ''}</td>
                        <td><span className={`cell-badge badge-${c.status}`}>{c.status === 'completed' ? 'Yakunlangan' : 'Jarayonda'}</span></td>
                        <td>{c.created_by_name || '—'}</td><td>{c.items?.length || 0}</td>
                        <td><button className="btn btn-ghost btn-sm" onClick={async () => { const f = await apiGet(`/inventory/${c.id}`); setViewCheck(f); }}>Batafsil</button></td></tr>)}</tbody></table></div>
        </div></>);
}
