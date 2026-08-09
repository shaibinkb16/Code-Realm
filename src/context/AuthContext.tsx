import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';

interface AuthContextType {
  user: any;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (userData: any) => Promise<void>;
  finalizeLogin: (tokens: { access_token: string, refresh_token: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('coderealm_token');
      if (token) {
        const userData = await api.getMe();
        setUser(userData);
      }
    } catch (error) {
      console.warn("Session invalid or expired", error);
      localStorage.removeItem('coderealm_token');
      localStorage.removeItem('coderealm_refresh_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (credentials: any) => {
    // This will throw if the account is not verified, which AuthView handles.
    const res = await api.login(credentials);
    await finalizeLogin(res);
  };

  const register = async (userData: any) => {
    await api.register(userData);
    // After registration, AuthView will handle the OTP transition.
  };

  const finalizeLogin = async (tokens: { access_token: string, refresh_token: string }) => {
    localStorage.setItem('coderealm_token', tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem('coderealm_refresh_token', tokens.refresh_token);
    }
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('coderealm_token');
    localStorage.removeItem('coderealm_refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, finalizeLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
