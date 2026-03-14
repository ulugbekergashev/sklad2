import React, { useState, useEffect } from 'react';
import {
    Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign,
    ShoppingCart, Clock, Activity, CheckCircle, RotateCcw, Calendar, Landmark, Star
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard({ token }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    
    const [startDate, setStartDate] = useState(thirtyDaysAgo);
    const [endDate, setEndDate] = useState(today);

    useEffect(() => {
        if (startDate && endDate) {
            fetchStats();
        }
    }, [startDate, endDate]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const url = `/api/dashboard/stats?startDate=${startDate}&endDate=${endDate}`;
            const res = await fetch(url, {
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

    if (loading && !stats) {
        return <div className="loading-spinner"><div className="spinner" /></div>;
    }

    return (
        <div id="unified-dashboard-v3" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div className="page-header" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Ombor boshqaruv tizimi holati</p>
                </div>
                <div className="flex items-center gap-3" style={{
                    background: 'var(--bg-glass-strong)',
                    padding: '6px 16px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div className="flex items-center gap-2">
                        <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', fontWeight: 500, width: '130px' }}
                        />
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>—</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', fontWeight: 500, width: '130px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Unified Stats Grid */}
            <div className="stats-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '20px',
                marginBottom: '40px'
            }}>
                <div className="stat-card">
                    <div className="stat-icon green"><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Savdo</div>
                        <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(stats?.revenue)}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon red"><TrendingDown size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Xarajat</div>
                        <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(stats?.expense)}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon blue"><DollarSign size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Sof Foyda</div>
                        <div className="stat-value" style={{ fontSize: '1.4rem', color: (stats?.netProfit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(stats?.netProfit)}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon purple"><RotateCcw size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Vozvratlar soni</div>
                        <div className="stat-value" style={{ fontSize: '1.4rem' }}>{stats?.returnsCount || 0} ta</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon yellow"><CheckCircle size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Undirilgan qarzlar</div>
                        <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(stats?.debtCollected)}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon indigo" style={{ color: '#6366f1' }}><Package size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Jami mahsulotlar</div>
                        <div className="stat-value">{stats?.totalProducts || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon emerald" style={{ color: '#10b981' }}><DollarSign size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Ombor qiymati</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(stats?.stockValue)}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon sky" style={{ color: '#0ea5e9' }}><Landmark size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Qarzlar (Debitorlik)</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(stats?.totalReceivable)}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon rose" style={{ color: '#f43f5e' }}><AlertTriangle size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Kam qolgan</div>
                        <div className="stat-value">{stats?.lowStockCount || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon amber" style={{ color: '#f59e0b' }}><Clock size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Kutilayotgan Zayavkalar</div>
                        <div className="stat-value">{stats?.pendingRequests || 0}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', alignItems: 'start' }}>
                <div className="chart-container" style={{ margin: 0, height: '100%' }}>
                    <h3 className="chart-title"><TrendingUp size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> Muddat dinamikasi</h3>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={stats?.chartData || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={(val) => { const d = new Date(val); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                            <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f1f5f9' }} formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="kirim" name="Kirim" stroke="#22c55e" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="chiqim" name="Sotuv" stroke="#ef4444" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card" style={{ margin: 0, height: '100%' }}>
                    <h3 className="chart-title" style={{ marginBottom: '20px' }}><Star size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: '#f59e0b' }} /> Eng ko'p sotilganlar</h3>
                    <div className="top-products-list">
                        {stats?.topProducts?.map((p, index) => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: index < stats.topProducts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>{index + 1}</div>
                                    <span style={{ color: '#f8fafc', fontWeight: 500, fontSize: '15px' }}>{p.name}</span>
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500, background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '12px' }}>{p.total_quantity} {p.unit}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
