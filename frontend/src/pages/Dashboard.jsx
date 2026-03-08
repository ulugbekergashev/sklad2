import { useState, useEffect } from 'react';
import { apiGet } from '../api';
import {
    Package, TrendingUp, TrendingDown, AlertTriangle,
    ArrowDownToLine, ArrowUpFromLine, Layers
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const formatNumber = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n?.toLocaleString?.() || '0';
};

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [trend, setTrend] = useState([]);
    const [recent, setRecent] = useState([]);
    const [lowStock, setLowStock] = useState([]);

    useEffect(() => {
        apiGet('/dashboard/stats').then(setStats).catch(console.error);
        apiGet('/dashboard/trend?days=7').then(setTrend).catch(console.error);
        apiGet('/dashboard/recent?limit=8').then(setRecent).catch(console.error);
        apiGet('/dashboard/low-stock').then(setLowStock).catch(console.error);
    }, []);

    const statCards = stats ? [
        { label: 'Jami mahsulotlar', value: stats.total_products, icon: Package, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
        { label: 'Umumiy qiymat', value: formatNumber(stats.total_value) + " so'm", icon: Layers, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
        { label: 'Bugungi kirim', value: stats.today_in, icon: TrendingUp, color: '#22c55e', bg: 'var(--success-bg)' },
        { label: 'Bugungi chiqim', value: stats.today_out, icon: TrendingDown, color: '#ef4444', bg: 'var(--danger-bg)' },
        { label: 'Kam qolgan', value: stats.low_stock_count, icon: AlertTriangle, color: '#f59e0b', bg: 'var(--warning-bg)' },
        { label: 'Kategoriyalar', value: stats.categories_count, icon: Layers, color: '#3b82f6', bg: 'var(--info-bg)' },
    ] : [];

    const customTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem',
            }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
                {payload.map(p => (
                    <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
                        {p.dataKey === 'incoming' ? 'Kirim' : 'Chiqim'}: {p.value}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-title">Dashboard</div>
                    <div className="page-subtitle">Ombor holati umumiy ko'rinishi</div>
                </div>
            </div>
            <div className="page-body animate-in">
                <div className="stats-grid">
                    {statCards.map((s, i) => (
                        <div className="stat-card" key={i} style={{ '--stat-color': s.color }}>
                            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                                <s.icon size={22} />
                            </div>
                            <div className="stat-value">{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                <div className="dashboard-grid">
                    <div className="card full-width">
                        <div className="card-header">
                            <h3>Haftalik kirim/chiqim trendi</h3>
                        </div>
                        <div className="card-body">
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trend}>
                                        <defs>
                                            <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                                        <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                                        <Tooltip content={customTooltip} />
                                        <Area type="monotone" dataKey="incoming" stroke="#22c55e" fillOpacity={1} fill="url(#colorIn)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="outgoing" stroke="#ef4444" fillOpacity={1} fill="url(#colorOut)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3>Kam qolgan mahsulotlar</h3>
                            <span className="cell-badge badge-low">{lowStock.length}</span>
                        </div>
                        <div className="card-body">
                            {lowStock.length === 0 ? (
                                <div className="empty-state" style={{ padding: 24 }}>
                                    <p>Barcha mahsulotlar yetarli</p>
                                </div>
                            ) : lowStock.slice(0, 6).map(item => (
                                <div className="low-stock-item" key={item.id}>
                                    <div className="item-info">
                                        <div className="item-name">{item.name}</div>
                                        <div className="item-sku">{item.sku}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ color: 'var(--warning)', fontWeight: 700, fontSize: '0.9rem' }}>
                                            {item.current_stock}
                                        </span>
                                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}> / {item.min_stock} {item.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card recent-activity">
                        <div className="card-header">
                            <h3>Oxirgi harakatlar</h3>
                        </div>
                        <div className="card-body">
                            {recent.length === 0 ? (
                                <div className="empty-state" style={{ padding: 24 }}>
                                    <p>Harakatlar yo'q</p>
                                </div>
                            ) : recent.map(item => (
                                <div className="activity-item" key={item.id}>
                                    <div className={`activity-icon ${item.movement_type === 'IN' ? 'in' : 'out'}`}>
                                        {item.movement_type === 'IN' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.product_name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                            {item.created_at ? new Date(item.created_at).toLocaleString('uz-UZ') : ''}
                                        </div>
                                    </div>
                                    <span className={`cell-badge ${item.movement_type === 'IN' ? 'badge-in' : 'badge-out'}`}>
                                        {item.movement_type === 'IN' ? '+' : '-'}{item.quantity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
