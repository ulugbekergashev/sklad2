import React, { useState, useEffect } from 'react';
import {
    Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign,
    ShoppingCart, Clock, Activity, CheckCircle, RotateCcw, Calendar, Landmark, Star
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import {
    Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign,
    ShoppingCart, Clock, Activity, CheckCircle, RotateCcw, Calendar, Landmark, Star,
    ChevronDown, Filter, Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Custom Debounce Hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = React.useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function Dashboard({ token }) {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

    const [dateRange, setDateRange] = useState({ start: thirtyDaysAgo, end: today });
    const debouncedRange = useDebounce(dateRange, 500);

    const [stats, setStats] = useState(null);
    const [globalStats, setGlobalStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [periodLoading, setPeriodLoading] = useState(false);

    // Initial load - fetch ALL
    useEffect(() => {
        fetchData('all', dateRange.start, dateRange.end);
    }, []);

    // Date range change - fetch PERIOD only
    useEffect(() => {
        if (debouncedRange.start && debouncedRange.end && globalStats) {
            fetchData('period', debouncedRange.start, debouncedRange.end);
        }
    }, [debouncedRange]);

    const fetchData = async (scope, start, end) => {
        const controller = new AbortController();
        try {
            if (scope === 'all') setLoading(true);
            else setPeriodLoading(true);

            const url = `/api/dashboard/stats?startDate=${start}&endDate=${end}&scope=${scope}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal
            });
            if (!res.ok) throw new Error('Fetch failed');
            const data = await res.json();
            
            if (scope === 'all' || scope === 'global') setGlobalStats(data);
            if (scope === 'all' || scope === 'period') setStats(data);
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Dashboard error:', err);
        } finally {
            if (scope === 'all') setLoading(false);
            setPeriodLoading(false);
        }
    };

    const handleQuickSelect = (days) => {
        const end = new Date().toISOString().split('T')[0];
        const start = new Date(new Date().setDate(new Date().getDate() - days)).toISOString().split('T')[0];
        setDateRange({ start, end });
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(val || 0) + ' so\'m';
    };

    if (loading && !stats) {
        return <div className="loading-spinner"><div className="spinner" /></div>;
    }

    // Combine stats for UI
    const uiStats = { ...globalStats, ...stats };

    return (
        <div id="unified-dashboard-v3" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div className="page-header" style={{ marginBottom: '32px', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Tizimning umumiy holati va tahlili</p>
                </div>

                <div className="flex flex-col gap-3 items-end">
                    <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                        {[
                            { label: '7 kun', val: 7 },
                            { label: '30 kun', val: 30 },
                            { label: '90 kun', val: 90 }
                        ].map(opt => (
                            <button 
                                key={opt.val}
                                onClick={() => handleQuickSelect(opt.val)}
                                className="btn-secondary btn-sm"
                                style={{ borderRadius: '12px', fontSize: '12px' }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-4" style={{
                        background: 'var(--bg-glass-strong)',
                        padding: '10px 20px',
                        borderRadius: '20px',
                        border: '1px solid var(--border-color)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: 'var(--shadow-lg)',
                        position: 'relative',
                        transition: 'all 0.3s ease'
                    }}>
                        {periodLoading && (
                            <div style={{ position: 'absolute', top: '-10px', right: '10px' }}>
                                <Zap size={14} className="animate-pulse" style={{ color: 'var(--warning)' }} />
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Dan</span>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} style={{ color: 'var(--accent-primary)' }} />
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', fontWeight: 600, width: '120px' }}
                                />
                            </div>
                        </div>
                        
                        <div style={{ width: '1px', height: '30px', background: 'var(--border-color)', margin: '0 8px' }} />

                        <div className="flex flex-col gap-1">
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Gacha</span>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} style={{ color: 'var(--accent-primary)' }} />
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', fontWeight: 600, width: '120px' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="stats-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '20px',
                marginBottom: '40px',
                opacity: periodLoading ? 0.7 : 1,
                transition: 'opacity 0.2s ease'
            }}>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(0, 0, 0, 0))' }}>
                    <div className="stat-icon green"><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Davriy Savdo</div>
                        <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(uiStats?.revenue)}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(0, 0, 0, 0))' }}>
                    <div className="stat-icon red"><TrendingDown size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Davriy Xarajat</div>
                        <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(uiStats?.expense)}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon blue"><Activity size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Sof Foyda</div>
                        <div className="stat-value" style={{ fontSize: '1.4rem', color: (uiStats?.netProfit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(uiStats?.netProfit)}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon purple"><RotateCcw size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Vozvratlar</div>
                        <div className="stat-value" style={{ fontSize: '1.4rem' }}>{uiStats?.returnsCount || 0} ta</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon yellow"><CheckCircle size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Undirilgan qarzlar</div>
                        <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(uiStats?.debtCollected)}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon indigo" style={{ color: '#6366f1' }}><Package size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Jami mahsulotlar</div>
                        <div className="stat-value">{uiStats?.totalProducts || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon emerald" style={{ color: '#10b981' }}><Landmark size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Ombor qiymati</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(uiStats?.stockValue)}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon sky" style={{ color: '#0ea5e9' }}><Filter size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-label">Qarzlar (Debitorlik)</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(uiStats?.totalReceivable)}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', alignItems: 'start' }}>
                <div className="chart-container glass-card" style={{ margin: 0, height: '100%', opacity: periodLoading ? 0.7 : 1 }}>
                    <h3 className="chart-title" style={{ marginBottom: '24px' }}><Activity size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--accent-primary)' }} /> Savdo va Kirim dinamikasi</h3>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={uiStats?.chartData || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={(val) => { const d = new Date(val); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                            <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} formatter={(value) => formatCurrency(value)} />
                            <Legend iconType="circle" />
                            <Line type="monotone" dataKey="kirim" name="Kirim" stroke="#22c55e" strokeWidth={3} dot={false} animationDuration={1000} />
                            <Line type="monotone" dataKey="chiqim" name="Sotuv" stroke="#ef4444" strokeWidth={3} dot={false} animationDuration={1000} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card" style={{ margin: 0, height: '100%', opacity: periodLoading ? 0.7 : 1 }}>
                    <h3 className="chart-title" style={{ marginBottom: '24px' }}><Star size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: '#f59e0b' }} /> Eng ko'p sotilganlar</h3>
                    <div className="top-products-list">
                        {uiStats?.topProducts?.map((p, index) => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: index < uiStats.topProducts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>{index + 1}</div>
                                    <span style={{ color: '#f8fafc', fontWeight: 500, fontSize: '15px' }}>{p.name}</span>
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>{p.total_quantity} {p.unit}</div>
                            </div>
                        ))}
                        {(!uiStats?.topProducts || uiStats.topProducts.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Ma'lumot topilmadi</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
