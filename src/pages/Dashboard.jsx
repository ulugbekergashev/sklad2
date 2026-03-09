import { useState, useEffect } from 'react';
import { Package, DollarSign, AlertTriangle, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard({ token }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/dashboard/stats', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('uz-UZ').format(val || 0) + ' so\'m';
    };

    if (loading) {
        return <div className="loading-spinner"><div className="spinner" /></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Ombor boshqaruv tizimi</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon purple"><Package size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Jami mahsulotlar</div>
                        <div className="stat-value">{stats?.totalProducts || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green"><DollarSign size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Ombor qiymati</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                            {formatCurrency(stats?.stockValue)}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon red"><AlertTriangle size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Kam qolgan</div>
                        <div className="stat-value">{stats?.lowStockCount || 0}</div>
                        <div className="stat-change down">
                            <TrendingDown size={12} /> Ogohlantirish
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon blue"><Landmark size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Bizga berilishi kerak</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                            {formatCurrency(stats?.totalReceivable)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="chart-container">
                <h3 className="chart-title">
                    <TrendingUp size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                    Oxirgi 30 kunlik Kirim/Chiqim dinamikasi
                </h3>
                {stats?.chartData?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={stats.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis
                                dataKey="date"
                                stroke="#64748b"
                                fontSize={12}
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    return `${d.getDate()}/${d.getMonth() + 1}`;
                                }}
                            />
                            <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                            <Tooltip
                                contentStyle={{
                                    background: '#1a1a2e',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px',
                                    color: '#f1f5f9',
                                }}
                                formatter={(value) => formatCurrency(value)}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="kirim" name="Kirim" stroke="#22c55e" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="chiqim" name="Chiqim" stroke="#ef4444" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="empty-state">
                        <p>Hali tranzaksiyalar yo'q</p>
                    </div>
                )}
            </div>

            {/* Low Stock Alerts */}
            {stats?.lowStockProducts?.length > 0 && (
                <div className="glass-card">
                    <h3 className="chart-title">
                        <AlertTriangle size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--danger)' }} />
                        Kam qolgan mahsulotlar
                    </h3>
                    <div className="alert-list">
                        {stats.lowStockProducts.map(p => (
                            <div key={p.id} className="alert-item">
                                <div className="alert-item-info">
                                    <AlertTriangle size={18} color="var(--danger)" />
                                    <span className="alert-item-name">{p.name}</span>
                                </div>
                                <div className="alert-item-stock">
                                    {parseFloat(p.current_stock)} / {parseFloat(p.min_stock)} {p.unit}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
