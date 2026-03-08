import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine,
    ClipboardCheck, BarChart3, Settings, LogOut, Boxes, Wallet, Menu, X
} from 'lucide-react';
import AIAssistant from './AIAssistant';

const navItems = [
    { label: 'Asosiy', section: true },
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/products', icon: Package, label: 'Mahsulotlar' },
    { label: 'Operatsiyalar', section: true },
    { path: '/incoming', icon: ArrowDownToLine, label: 'Kirim' },
    { path: '/outgoing', icon: ArrowUpFromLine, label: 'Chiqim' },
    { path: '/inventory', icon: ClipboardCheck, label: 'Inventarizatsiya' },
    { path: '/debts', icon: Wallet, label: 'Qarzdorliklar' },
    { label: 'Tahlil', section: true },
    { path: '/reports', icon: BarChart3, label: 'Hisobotlar' },
    { path: '/settings', icon: Settings, label: 'Sozlamalar' },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = (name) => {
        return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
    };

    const roleLabels = {
        admin: 'Administrator',
        manager: 'Menejer',
        warehouse_staff: 'Omborchi',
    };

    return (
        <div className="app-layout">
            {/* Mobile Header */}
            <div className="mobile-header">
                <div className="sidebar-logo">
                    <div className="logo-icon"><Boxes size={22} /></div>
                    <div className="logo-text">
                        <h1>SKLAD</h1>
                    </div>
                </div>
                <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar Overlay for Mobile */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
            )}

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo desktop-logo">
                    <div className="logo-icon">
                        <Boxes size={22} />
                    </div>
                    <div>
                        <h1>SKLAD</h1>
                        <span>Ombor boshqaruvi</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item, i) =>
                        item.section ? (
                            <div key={i} className="nav-section-label">{item.label}</div>
                        ) : (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </NavLink>
                        )
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info" onClick={handleLogout} title="Chiqish">
                        <div className="user-avatar">{getInitials(user?.full_name)}</div>
                        <div className="user-details">
                            <div className="user-name">{user?.full_name}</div>
                            <div className="user-role">{roleLabels[user?.role] || user?.role}</div>
                        </div>
                        <LogOut size={16} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>

            {/* AI Assistant Floating Widget */}
            <AIAssistant />
        </div>
    );
}
