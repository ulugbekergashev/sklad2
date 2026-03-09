import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine,
    Landmark, ClipboardList, FileBarChart, LogOut, Warehouse, Users, Tag, Menu, X
} from 'lucide-react';
import AIChat from './AIChat';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/products', icon: Package, label: 'Mahsulotlar' },
    { path: '/incoming', icon: ArrowDownToLine, label: 'Kirim' },
    { path: '/outgoing', icon: ArrowUpFromLine, label: 'Chiqim' },
    { path: '/debts', icon: Landmark, label: 'Qarzlar' },
    { path: '/requests', icon: Package, label: 'Zayavkalar' },
    { path: '/inventory', icon: ClipboardList, label: 'Inventarizatsiya' },
    { path: '/reports', icon: FileBarChart, label: 'Hisobotlar' },
];

const settingsItems = [
    { path: '/categories', icon: Tag, label: 'Kategoriyalar' },
    { path: '/staff', icon: Users, label: 'Xodimlar' },
];

export default function Layout({ children, user, onLogout }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const token = localStorage.getItem('sklad_token');

    // Sahifa o'zgarganda sidebar'ni yopish
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // ESC tugmasi bilan yopish
    useEffect(() => {
        const handleEsc = (e) => e.key === 'Escape' && setSidebarOpen(false);
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

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
                <div className="page-container">
                    {children}
                </div>
            </main>

            <AIChat token={token} />
        </div>
    );
}
