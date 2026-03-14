import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Package, ArrowDownToLine, ShoppingCart,
    Landmark, ClipboardList, FileBarChart, LogOut, Warehouse, Users, Tag, Menu, X, RotateCcw, Search, Loader2
} from 'lucide-react';
import AIChat from './AIChat';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/products', icon: Package, label: 'Mahsulotlar' },
    { path: '/incoming', icon: ArrowDownToLine, label: 'Kirim' },
    { path: '/sales', icon: ShoppingCart, label: 'Sotuv' },
    { path: '/debts', icon: Landmark, label: 'Qarzlar' },
    { path: '/requests', icon: Package, label: 'Zayavkalar' },
    { path: '/inventory', icon: ClipboardList, label: 'Inventarizatsiya' },
    { path: '/returns', icon: RotateCcw, label: 'Vozvrat' },
    { path: '/reports', icon: FileBarChart, label: 'Hisobotlar' },
];

const settingsItems = [
    { path: '/categories', icon: Tag, label: 'Kategoriyalar' },
    { path: '/staff', icon: Users, label: 'Xodimlar' },
];

export default function Layout({ children, user, onLogout }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    
    const location = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem('sklad_token');

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                setSearchResults(data);
                setShowResults(true);
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, token]);

    // Cleanup on navigation
    useEffect(() => {
        setSidebarOpen(false);
        setShowResults(false);
    }, [location.pathname]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSidebarOpen(false);
                setShowResults(false);
            }
            if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                document.getElementById('global-search')?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const formatPrice = (val) => new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(val || 0);

    const handleResultClick = (product) => {
        setShowResults(false);
        setSearchQuery('');
        navigate(`/products?search=${encodeURIComponent(product.sku)}`);
    };

    return (
        <div className="app-layout">
            {/* Mobile hamburger button */}
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Backdrop */}
            {sidebarOpen && (
                <div className="sidebar-backdrop show" onClick={() => setSidebarOpen(false)} />
            )}

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">
                            <Warehouse size={22} />
                        </div>
                        <span className="sidebar-logo-text">SKLAD</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section-title">Asosiy</div>
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <item.icon className="sidebar-link-icon" size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}

                    <div className="sidebar-section-title" style={{ marginTop: '16px' }}>Sozlamalar</div>
                    {settingsItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <item.icon className="sidebar-link-icon" size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar">
                            {user?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{user?.full_name}</div>
                            <div className="sidebar-user-role">
                                {user?.role === 'admin' ? 'Administrator' : 'Xodim'}
                            </div>
                        </div>
                        <button className="btn-icon" onClick={onLogout} title="Chiqish">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <header className="app-header">
                    <div className="global-search-container">
                        <div className="global-search-wrapper">
                            <Search size={18} className="text-muted" />
                            <input
                                id="global-search"
                                type="text"
                                className="global-search-input"
                                placeholder="Mahsulot yoki SKU bo'yicha qidirish..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchQuery.trim() && setShowResults(true)}
                            />
                            {isSearching ? <Loader2 size={16} className="spinner" /> : <div className="global-search-shortcut">/</div>}
                        </div>

                        {showResults && (
                            <>
                                <div className="sidebar-backdrop show" style={{ zIndex: 99, background: 'transparent' }} onClick={() => setShowResults(false)} />
                                <div className="search-results-dropdown">
                                    {searchResults.length === 0 ? (
                                        <div className="search-no-results">Natija topilmadi</div>
                                    ) : (
                                        searchResults.map(p => (
                                            <div key={p.id} className="search-result-item" onClick={() => handleResultClick(p)}>
                                                <div className="search-result-image">
                                                    <Package size={20} />
                                                </div>
                                                <div className="search-result-info">
                                                    <div className="search-result-name">{p.name}</div>
                                                    <div className="search-result-meta">
                                                        <span>SKU: {p.sku}</span>
                                                        <span>•</span>
                                                        <span className="search-result-price">{formatPrice(p.price)} so'm</span>
                                                        <span>•</span>
                                                        <span className={parseFloat(p.current_stock) <= parseFloat(p.min_stock) ? 'low-stock' : ''}>
                                                            {parseFloat(p.current_stock)} {p.unit}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Any header actions could go here */}
                    </div>
                </header>

                <div className="page-container">
                    {children}
                </div>
            </main>

            <AIChat token={token} />
        </div>
    );
}
