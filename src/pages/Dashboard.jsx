import { useState, useEffect } from 'react';
import { Package, DollarSign, AlertTriangle, Landmark, TrendingUp, TrendingDown, Clock, ShoppingCart, Star, ArrowUpRight, ArrowDownRight, Activity, FileText, CheckCircle, PlusCircle } from 'lucide-react';
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

                <div className="stat-card">
                    <div className="stat-icon green" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}><ShoppingCart size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Bugungi Savdo</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                            {formatCurrency(stats?.todaySales)}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }}><Clock size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Kutilayotgan Zayavkalar</div>
                        <div className="stat-value">{stats?.pendingRequests || 0}</div>
                    </div>
                </div>
            </div>

            {/* 1 Month Stats Section */}
            <div className="page-header" style={{ marginTop: '32px' }}>
                <div>
                    <h2 className="page-title" style={{ fontSize: '1.25rem' }}>1 Oylik Ko'rsatkichlar (Oxirgi 30 kun)</h2>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}><ArrowUpRight size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">1 Oylik Savdo</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                            {formatCurrency(stats?.monthlyRevenue)}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><ArrowDownRight size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">1 Oylik Rasxod</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                            {formatCurrency(stats?.monthlyExpense)}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}><Activity size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">1 Oylik Sof Foyda</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                            {formatCurrency(stats?.monthlyNetProfit)}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}><FileText size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">30 Kunda Zayavkalar</div>
                        <div className="stat-value">{stats?.monthlyRequests || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}><CheckCircle size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">1 Oyda Undirilgan Qarzlar</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                            {formatCurrency(stats?.monthlyDebtCollected)}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}><PlusCircle size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Yangi Mahsulotlar (1 Oy)</div>
                        <div className="stat-value">{stats?.monthlyProductsAdded || 0}</div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '24px', alignItems: 'start' }}>
                {/* Chart */}
                <div className="chart-container" style={{ margin: 0, height: '100%' }}>
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

                {/* Top Products */}
                <div className="glass-card" style={{ margin: 0, height: '100%' }}>
                    <h3 className="chart-title" style={{ marginBottom: '20px' }}>
                        <Star size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: '#f59e0b' }} />
                        Top 5 Sotilganlar (30 kun)
                    </h3>
                    <div className="top-products-list">
                        {stats?.topProducts?.length > 0 ? (
                            stats.topProducts.map((p, index) => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: index < stats.topProducts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                                            {index + 1}
                                        </div>
                                        <span style={{ color: '#f8fafc', fontWeight: 500, fontSize: '15px' }}>{p.name}</span>
                                    </div>
                                    <div style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500, background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '12px' }}>
                                        {p.total_quantity} {p.unit}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state" style={{ padding: '20px 0' }}>
                                <p>Ma'lumot yo'q</p>
                            </div>
                        )}
                    </div>
                </div>
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
