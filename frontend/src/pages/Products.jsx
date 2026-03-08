import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../api';
import Modal from '../components/Modal';
import { Plus, Search, Edit2, Trash2, Package, Filter } from 'lucide-react';

const UNITS = ['dona', 'kg', 'litr', 'metr', 'qop', 'pachka', 'quti'];

export default function Products() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState(0);
    const [lowOnly, setLowOnly] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', sku: '', barcode: '', category_id: '', unit: 'dona', price: 0, min_stock: 0, location: '' });

    const load = () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (catFilter) params.set('category_id', catFilter);
        if (lowOnly) params.set('low_stock', 'true');
        apiGet(`/products/?${params}`).then(setProducts).catch(console.error);
    };

    useEffect(() => { load(); }, [search, catFilter, lowOnly]);
    useEffect(() => { apiGet('/categories/').then(setCategories).catch(console.error); }, []);

    const openNew = () => {
        setEditing(null);
        setForm({ name: '', sku: '', barcode: '', category_id: '', unit: 'dona', price: 0, min_stock: 0, location: '' });
        setShowModal(true);
    };

    const openEdit = (p) => {
        setEditing(p);
        setForm({
            name: p.name, sku: p.sku, barcode: p.barcode || '', category_id: p.category_id || '',
            unit: p.unit, price: p.price, min_stock: p.min_stock, location: p.location,
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const data = { ...form, category_id: form.category_id || null, price: Number(form.price), min_stock: Number(form.min_stock) };
            if (editing) {
                await apiPut(`/products/${editing.id}`, data);
            } else {
                await apiPost('/products/', data);
            }
            setShowModal(false);
            load();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Mahsulotni o'chirmoqchimisiz?")) return;
        try { await apiDelete(`/products/${id}`); load(); } catch (err) { alert(err.message); }
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-title">Mahsulotlar</div>
                    <div className="page-subtitle">{products.length} ta mahsulot</div>
                </div>
                <button className="btn btn-primary" onClick={openNew}>
                    <Plus size={16} /> Yangi mahsulot
                </button>
            </div>

            <div className="page-body animate-in">
                <div className="table-wrapper">
                    <div className="table-toolbar">
                        <div className="search-box">
                            <Search size={16} className="search-icon" />
                            <input
                                placeholder="Qidiruv (nom, SKU, barcode)..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <select className="form-select" style={{ width: 160 }} value={catFilter} onChange={e => setCatFilter(Number(e.target.value))}>
                            <option value={0}>Barcha kategoriya</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} /> Kam qolganlar
                        </label>
                    </div>

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nomi</th>
                                <th>SKU</th>
                                <th>Kategoriya</th>
                                <th>Zaxira</th>
                                <th>Birlik</th>
                                <th>Narx</th>
                                <th>Joylashuv</th>
                                <th style={{ width: 80 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr><td colSpan={8} className="table-empty"><Package size={40} /><div>Mahsulotlar topilmadi</div></td></tr>
                            ) : products.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                    <td className="cell-mono">{p.sku}</td>
                                    <td>{p.category_name || '—'}</td>
                                    <td>
                                        <span className={`cell-badge ${p.min_stock > 0 && p.current_stock <= p.min_stock ? 'badge-low' : 'badge-ok'}`}>
                                            {p.current_stock}
                                        </span>
                                    </td>
                                    <td>{p.unit}</td>
                                    <td>{p.price?.toLocaleString()} so'm</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{p.location || '—'}</td>
                                    <td>
                                        <div className="btn-group">
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}>
                <form onSubmit={handleSave}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Nomi *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">SKU *</label>
                                <input className="form-input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Kategoriya</label>
                                <select className="form-select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value ? Number(e.target.value) : '' })}>
                                    <option value="">Tanlang</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Birlik</label>
                                <select className="form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row-3">
                            <div className="form-group">
                                <label className="form-label">Narx (so'm)</label>
                                <input className="form-input" type="number" min={0} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Min. zaxira</label>
                                <input className="form-input" type="number" min={0} value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Joylashuv</label>
                                <input className="form-input" placeholder="A-1-3" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor qilish</button>
                        <button type="submit" className="btn btn-primary">{editing ? 'Saqlash' : 'Qo\'shish'}</button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
