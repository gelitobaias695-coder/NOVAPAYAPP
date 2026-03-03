import React, { createContext, useContext, useState, useEffect } from "react";

interface AdminUser {
    id: string;
    name: string;
    email: string;
}

interface AuthContextType {
    user: AdminUser | null;
    token: string | null;
    login: (token: string, user: AdminUser) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    login: () => { },
    logout: () => { },
    isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem("novapay_admin_token");
        const storedUser = localStorage.getItem("novapay_admin_user");

        if (storedToken && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
                setToken(storedToken);
            } catch (e) {
                localStorage.removeItem("novapay_admin_token");
                localStorage.removeItem("novapay_admin_user");
            }
        }
    }, []);

    const login = (newToken: string, newUser: AdminUser) => {
        localStorage.setItem("novapay_admin_token", newToken);
        localStorage.setItem("novapay_admin_user", JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem("novapay_admin_token");
        localStorage.removeItem("novapay_admin_user");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
