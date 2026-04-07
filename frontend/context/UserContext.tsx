import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface UserProfile {
  id: string;
  name: string;
  age: number;
  language: string;
  profile_photo?: string;
  super_user_name?: string;
  super_user_phone?: string;
  super_user_language?: string;
}

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  createUser: (name: string, age: number, language: string) => Promise<void>;
  updateUser: (data: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userId = await AsyncStorage.getItem('medilang_user_id');
      if (userId) {
        const response = await axios.get(`${API_URL}/api/users/${userId}`);
        setUser(response.data);
      }
    } catch (e) {
      console.log('Error loading user:', e);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (name: string, age: number, language: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/users`, {
        name,
        age,
        language
      });
      const newUser = response.data.user;
      await AsyncStorage.setItem('medilang_user_id', newUser.id);
      setUser(newUser);
    } catch (e) {
      console.log('Error creating user:', e);
      throw e;
    }
  };

  const updateUser = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const response = await axios.put(`${API_URL}/api/users/${user.id}`, data);
      setUser(response.data.user);
    } catch (e) {
      console.log('Error updating user:', e);
      throw e;
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <UserContext.Provider value={{ user, loading, createUser, updateUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
