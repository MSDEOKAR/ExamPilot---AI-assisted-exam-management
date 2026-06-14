import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout({ children, title }) {
    const { admin, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    const links = [
        { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
        { to: '/admin/questions', icon: '❓', label: 'Questions' },
        { to: '/admin/exams', icon: '📝', label: 'Exams' },
        { to: '/admin/results', icon: '📈', label: 'Results' },
    ];

    return (
        <div className="admin-layout">
            {/* Mobile Header */}
            <header className="mobile-admin-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 10px', fontSize: '16px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}
                    >
                        ☰
                    </button>
                    <div style={{ fontWeight: 800, fontSize: '18px', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        🧠 ExamAI Admin
                    </div>
                </div>
                <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    🚪 Logout
                </button>
            </header>

            {/* Sidebar Overlay (Mobile) */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 40,
                        backdropFilter: 'blur(4px)',
                        animation: 'fadeIn 0.2s ease'
                    }}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2>🧠 ExamAI</h2>
                            <p>Admin Panel</p>
                        </div>
                        {/* Close button inside sidebar on mobile */}
                        <button
                            className="btn btn-secondary btn-sm mobile-close-btn"
                            onClick={() => setSidebarOpen(false)}
                            style={{ display: 'none', padding: '4px 8px', fontSize: '12px' }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)} // Close sidebar when link is clicked
                        >
                            <span className="link-icon">{link.icon}</span>
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
                <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-glass)' }}>
                    <div style={{ padding: '0 16px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Signed in as</div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{admin?.username}</div>
                    </div>
                    <button className="sidebar-link" onClick={handleLogout} style={{ color: 'var(--error)' }}>
                        <span className="link-icon">🚪</span>
                        Logout
                    </button>
                </div>
            </aside>
            <main className="admin-content">
                {title && (
                    <div className="page-header">
                        <h1 className="page-title">{title}</h1>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
