
'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import {
  onIdTokenChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, pass: string, companyName: string) => Promise<void>;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const idToken = await user.getIdToken();
        setToken(idToken);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      router.push('/dashboard');
      toast({ title: "Login Successful", description: "Welcome back!" });
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Login Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, companyName: string) => {
    setLoading(true);
    setError(null);
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass, companyName }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed.');
        }

        await signInWithEmailAndPassword(auth, email, pass);
        router.push('/dashboard');
        toast({ title: "Registration Successful", description: "Welcome to ARIA!" });
    } catch (e: any) {
        setError(e.message);
        toast({ title: "Registration Failed", description: e.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };


  const logout = async () => {
    try {
      await signOut(auth);
      queryClient.clear();
      router.push('/login');
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Logout Failed", description: e.message, variant: "destructive" });
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    register,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
