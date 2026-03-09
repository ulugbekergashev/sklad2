import { useState, useEffect } from 'react';
import { ClipboardList, Play, Check, Save } from 'lucide-react';

export default function Inventory({ token }) {
    const [checks, setChecks] = useState([]);
    const [activeCheck, setActiveCheck] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const fetchChecks = async () => {
        try {
            const res = await fetch('/api/inventory', { headers });
            const data = await res.json();
            setChecks(data);
            // Auto-open the latest in_progress check
            const inProgress = data.find(c => c.status === 'in_progress');
            if (inProgress) setActiveCheck(inProgress);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchChecks(); }, []);

    const startNew = async () => {
        try {
            const res = await fetch('/api/inventory/start', { method: 'POST', headers });
            if (res.ok) {
                const check = await res.json();
                setActiveCheck(check);
                fetchChecks();
            }
        } catch (err) {
            alert('Boshlashda xatolik');
        }
    };

    const updateQuantity = (itemId, value) => {
        if (!activeCheck) return;
        setActiveCheck(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.id === itemId ? {
                    ...item,
                    actual_quantity: value,
                    difference: (parseFloat(value || 0) - parseFloat(item.system_quantity)).toFixed(2),
                } : item
            ),
        }));
    };

    const saveItems = async () => {
        if (!activeCheck) return;
        setSaving(true);
        try {
            const items = activeCheck.items.map(i => ({
                id: i.id,
                actual_quantity: i.actual_quantity,
            }));
            const res = await fetch(`/api/inventory/${activeCheck.id}/items`, {
                method: 'PUT', headers,
                body: JSON.stringify({ items }),
            });
            if (res.ok) {
                const updated = await res.json();
                setActiveCheck(updated);
            }
        } catch (err) {
            alert('Saqlashda xatolik');
        } finally {
            setSaving(false);
        }
    };

    const completeCheck = async () => {
        if (!activeCheck) return;
        if (!confirm('Inventarizatsiyani yakunlashni xohlaysizmi? Barcha mahsulot qoldiqlari yangilanadi!')) return;

        try {
            await saveItems();
            const res = await fetch(`/api/inventory/${activeCheck.id}/complete`, {
                method: 'POST', headers,
            });
            if (res.ok) {
                setActiveCheck(null);
                fetchChecks();
                alert('✅ Inventarizatsiya muvaffaqiyatli yakunlandi! Qoldiqlar yangilandi.');
            }
        } catch (err) {
            alert('Yakunlashda xatolik');
        }
    };

    const getDiffClass = (diff) => {
        const d = parseFloat(diff);
        if (d > 0) return 'diff-positive';
        if (d < 0) return 'diff-negative';
        return 'diff-zero';
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventarizatsiya</h1>
                    <p className="page-subtitle">Ombordagi tovarlarni sanash va taqqoslash</p>
                </div>
                {!activeCheck && (
                    <button className="btn btn-primary" onClick={startNew}>
                        <Play size={18} /> Yangi inventarizatsiya
                    </button>
                )}
            </div>

            {activeCheck ? (
                <div>
                    {/* Active check info */}
                    <div className="glass-card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span className="badge badge-warning" style={{ marginRight: '12px' }}>Jarayonda</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                Boshlangan: {new Date(activeCheck.createdAt).toLocaleString('uz-UZ')}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary" onClick={saveItems} disabled={saving}>
                                <Save size={16} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                            </button>
                            <button className="btn btn-success" onClick={completeCheck}>
                                <Check size={16} /> Yakunlash
                            </button>
                        </div>
                    </div>

                    {/* Items table */}
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>№</th>
                                    <th>Mahsulot</th>
                                    <th>Tizim qoldig'i</th>
                                    <th>Haqiqiy qoldiq</th>
                                    <th>Farq</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeCheck.items?.map((item, i) => (
                                    <tr key={item.id}>
                                        <td>{i + 1}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {item.product?.name || 'Noma\'lum'}
                                        </td>
                                        <td>{parseFloat(item.system_quantity)} {item.product?.unit}</td>
                                        <td>
                                            <input
                                                className="form-input"
                                                type="number"
                                                step="any"
                                                style={{ width: '120px', padding: '6px 10px' }}
                                                value={item.actual_quantity ?? ''}
                                                onChange={e => updateQuantity(item.id, e.target.value)}
                                                placeholder="—"
                                            />
                                        </td>
                                        <td className={getDiffClass(item.difference)}>
                                            {item.actual_quantity !== null && item.actual_quantity !== '' ? (
                                                <>
                                                    {parseFloat(item.difference) > 0 ? '+' : ''}{parseFloat(item.difference || 0)}
                                                </>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                // History of completed checks
                <div>
                    {checks.length === 0 ? (
                        <div className="glass-card">
                            <div className="empty-state">
                                <ClipboardList size={48} />
                                <h3>Hali inventarizatsiya o'tkazilmagan</h3>
                                <p>"Yangi inventarizatsiya" tugmasini bosib boshlang</p>
                            </div>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>№</th>
                                        <th>Holat</th>
                                        <th>Boshlangan</th>
                                        <th>Yakunlangan</th>
                                        <th>Mahsulotlar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checks.map((c, i) => (
                                        <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => c.status === 'in_progress' && setActiveCheck(c)}>
                                            <td>{i + 1}</td>
                                            <td>
                                                <span className={`badge ${c.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                                                    {c.status === 'completed' ? 'Yakunlangan' : 'Jarayonda'}
                                                </span>
                                            </td>
                                            <td>{new Date(c.createdAt).toLocaleString('uz-UZ')}</td>
                                            <td>{c.completed_at ? new Date(c.completed_at).toLocaleString('uz-UZ') : '-'}</td>
                                            <td>{c.items?.length || 0} ta</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
