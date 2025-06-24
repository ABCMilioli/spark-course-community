import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { Profile } from '@/types';

export type User = Profile;
export type UserRole = Profile['role'];

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => void;
  isLoading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<{ error: any }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.REACT_APP_API_URL || '/api';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setIsLoading(false);
      return { error: null };
    } catch (error: any) {
      setIsLoading(false);
      return { error: error.response?.data?.error || 'Erro ao fazer login.' };
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(data);
    } catch (error) {
      setUser(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const signUp = async (name: string, email: string, password: string) => {
    console.log('AuthContext: Sign up attempt for:', email);
    const { error } = await axios.post(`${API_URL}/auth/signup`, {
      name,
      email,
      password,
    });
    if (error) {
      console.error('AuthContext: Sign up failed:', error);
    }
    return { error };
  };

  console.log('AuthContext: Rendering, isLoading:', isLoading, 'user:', user?.name || 'no user');

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, signUp, refreshUser }}>
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
