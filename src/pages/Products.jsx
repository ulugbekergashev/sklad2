import { Plus, Search, Edit2, Trash2, Package, X, ArrowDownToLine, ShoppingCart, RotateCcw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Products({ token }) {
    const location = useLocation();
    const navigate = useNavigate();
    
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    
    // URL search params dan qidiruvni olish
    const queryParams = new URLSearchParams(location.search);
    const initialSearch = queryParams.get('search') || '';
    
    const [search, setSearch] = useState(initialSearch);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [form, setForm] = useState({
        name: '', sku: '', barcode: '', unit: 'dona', price: '',
        min_stock: '', current_stock: '', location: '', category_id: '',
    });

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const fetchProducts = async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (categoryFilter) params.set('category_id', categoryFilter);
            const res = await fetch(`/api/products?${params}`, { headers });
            const data = await res.json();
            setProducts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories', { headers });
            setCategories(await res.json());
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchProducts, 300);
        return () => clearTimeout(timer);
    }, [search, categoryFilter]);

    const openAdd = () => {
        setEditProduct(null);
        setForm({ name: '', sku: '', barcode: '', unit: 'dona', price: '', min_stock: '', current_stock: '', location: '', category_id: '' });
        setShowModal(true);
    };

    const openEdit = (p) => {
        setEditProduct(p);
        setForm({
            name: p.name, sku: p.sku, barcode: p.barcode || '', unit: p.unit,
            price: p.price, min_stock: p.min_stock, current_stock: p.current_stock,
            location: p.location || '', category_id: p.category_id || '',
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products';
            const method = editProduct ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
            if (res.ok) {
                setShowModal(false);
                fetchProducts();
            } else {
                const err = await res.json();
                alert(err.error || 'Xatolik');
            }
        } catch (err) {
            alert('Server xatosi');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Mahsulotni o\'chirmoqchimisiz?')) return;
        try {
            await fetch(`/api/products/${id}`, { method: 'DELETE', headers });
            fetchProducts();
        } catch (err) {
            alert('O\'chirishda xatolik');
        }
    };

    const formatPrice = (val) => new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(val || 0);

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Mahsulotlar</h1>
                    <p className="page-subtitle">Jami: {products.length} ta mahsulot</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>
                    <Plus size={18} /> Yangi mahsulot
                </button>
            </div>

            {/* Filters */}
            <div className="filters-row">
                <div className="search-bar" style={{ flex: 1, maxWidth: 400 }}>
                    <Search size={18} />
                    <input
                        placeholder="Nom yoki SKU bo'yicha qidirish..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select className="form-select" style={{ width: 200 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                    <option value="">Barcha kategoriyalar</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Mahsulot</th>
                            <th>SKU</th>
                            <th>Kategoriya</th>
                            <th>Narxi</th>
                            <th>Qoldiq</th>
                            <th>Min. zaxira</th>
                            <th>Joylashuv</th>
                            <th>Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.length === 0 ? (
                            <tr><td colSpan={8}>
                                <div className="empty-state">
                                    <Package size={48} />
                                    <h3>Mahsulotlar topilmadi</h3>
                                    <p>Yangi mahsulot qo'shish uchun tugmani bosing</p>
                                </div>
                            </td></tr>
                        ) : products.map(p => {
                            const isLow = parseFloat(p.min_stock) > 0 && parseFloat(p.current_stock) <= parseFloat(p.min_stock);
                            return (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                                    <td><span className="badge badge-purple">{p.sku}</span></td>
                                    <td>
                                        {p.category ? (
                                            <span>
                                                <span className="category-dot" style={{ backgroundColor: p.category.color }} />
                                                {p.category.name}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td>{formatPrice(p.price)} so'm</td>
                                    <td className={isLow ? 'low-stock' : ''}>
                                        {Math.round(parseFloat(p.current_stock))} {p.unit}
                                    </td>
                                    <td>{Math.round(parseFloat(p.min_stock))} {p.unit}</td>
                                    <td>{p.location || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button className="btn-icon" onClick={() => navigate(`/incoming?product_id=${p.id}`)} title="Kirim qilish" style={{ color: 'var(--success)' }}>
                                                <ArrowDownToLine size={16} />
                                            </button>
                                            <button className="btn-icon" onClick={() => navigate(`/sales?product_id=${p.id}`)} title="Sotish" style={{ color: 'var(--warning)' }}>
                                                <ShoppingCart size={16} />
                                            </button>
                                            <button className="btn-icon" onClick={() => openEdit(p)} title="Tahrirlash"><Edit2 size={16} /></button>
                                            <button className="btn-icon" onClick={() => handleDelete(p.id)} title="O'chirish" style={{ color: 'var(--danger)' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title">{editProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Nomi *</label>
                                        <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Mahsulot nomi" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">SKU *</label>
                                        <input className="form-input" required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">O'lchov birligi</label>
                                        <select className="form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                                            <option value="dona">Dona</option>
                                            <option value="kg">Kilogramm</option>
                                            <option value="litr">Litr</option>
                                            <option value="metr">Metr</option>
                                            <option value="qop">Qop</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Kategoriya</label>
                                        <select className="form-select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                            <option value="">Tanlanmagan</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Narxi (so'm)</label>
                                        <input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Shtrix kod</label>
                                        <input className="form-input" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="Barcode" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Hozirgi qoldiq</label>
                                        <input className="form-input" type="number" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: e.target.value })} placeholder="0" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Min. zaxira</label>
                                        <input className="form-input" type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} placeholder="0" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Joylashuv</label>
                                    <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="A-1-01" />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-primary">
                                    {editProduct ? 'Saqlash' : 'Qo\'shish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
