import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout({ children, title }) {
    const { admin, logout } = useAuth();
    const navigate = useNavigate();

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
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <h2>🧠 ExamAI</h2>
                    <p>Admin Panel</p>
                </div>
                <nav className="sidebar-nav">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
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
