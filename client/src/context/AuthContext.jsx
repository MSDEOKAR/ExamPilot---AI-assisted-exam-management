import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        const adminData = localStorage.getItem('adminData');
        if (token && adminData) {
            setAdmin(JSON.parse(adminData));
        }
        setLoading(false);
    }, []);

    const login = (token, adminData) => {
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminData', JSON.stringify(adminData));
        setAdmin(adminData);
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        setAdmin(null);
    };

    return (
        <AuthContext.Provider value={{ admin, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
