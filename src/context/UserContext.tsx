import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// User data interface matching AuthResult from BE
export interface UserData {
    userId: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roleId?: string;
    roleName?: string;
    isActive: boolean;
    createdAt?: string;
}

interface UserContextType {
    user: UserData | null;
    setUser: (user: UserData | null) => void;
    saveUser: (user: UserData) => Promise<void>;
    clearUser: () => Promise<void>;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'userData';

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUserState] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user data from AsyncStorage on mount
    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            console.log('[UserContext] Loading user from AsyncStorage...');
            const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
            console.log('[UserContext] Raw userData from storage:', userData);
            if (userData) {
                const parsedUser = JSON.parse(userData);
                console.log('[UserContext] Parsed user data:', parsedUser);
                setUserState(parsedUser);
            } else {
                console.log('[UserContext] No user data found in storage');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setUser = useCallback((userData: UserData | null) => {
        setUserState(userData);
    }, []);

    const saveUser = useCallback(async (userData: UserData) => {
        try {
            console.log('[UserContext] saveUser called with:', userData);
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
            setUserState(userData);
            console.log('[UserContext] User saved successfully, new state:', userData);
        } catch (error) {
            console.error('Error saving user data:', error);
            throw error;
        }
    }, []);

    const clearUser = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
            setUserState(null);
        } catch (error) {
            console.error('Error clearing user data:', error);
            throw error;
        }
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser, saveUser, clearUser, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
