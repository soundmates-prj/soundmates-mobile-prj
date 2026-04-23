import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService } from '../api';

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
    updatedAt?: string;
    bio?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
    profileImageUrl?: string;
    backgroundImageUrl?: string;
    location?: string;
    website?: string;
}

interface RefreshUserOptions {
    expectedUpdatedAt?: string;
    expectedProfileImageUrl?: string;
    expectedBackgroundImageUrl?: string;
    maxAttempts?: number;
    delayMs?: number;
}

interface UserContextType {
    user: UserData | null;
    setUser: (user: UserData | null) => void;
    saveUser: (user: UserData) => Promise<void>;
    clearUser: () => Promise<void>;
    refreshUser: (options?: RefreshUserOptions) => Promise<void>;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'userData';

const normalizeImageValue = (value?: string | null): string => {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim();
};

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUserState] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user data from AsyncStorage on mount
    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);

            let parsedUser: UserData | null = null;
            if (userData) {
                parsedUser = JSON.parse(userData);
                setUserState(parsedUser);
            } else {
                console.log('[UserContext] No user data found in storage');
            }

            const accessToken = await AsyncStorage.getItem('accessToken');
            if (accessToken) {
                await refreshUser();
            }
        } catch (error) {
            console.log('Error loading user data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setUser = useCallback((userData: UserData | null) => {
        setUserState(userData);
    }, []);

    const saveUser = useCallback(async (userData: UserData) => {
        try {
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
            setUserState(userData);
        } catch (error) {
            console.log('Error saving user data:', error);
            throw error;
        }
    }, []);

    const clearUser = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
            await AsyncStorage.removeItem('liveGuestIdentifier');
            setUserState(null);
        } catch (error) {
            console.log('Error clearing user data:', error);
            throw error;
        }
    }, []);

    const refreshUser = useCallback(async (options?: RefreshUserOptions) => {
        const accessToken = await AsyncStorage.getItem('accessToken');
        if (!accessToken) return;

        const maxAttempts = options?.maxAttempts ?? 4;
        const delayMs = options?.delayMs ?? 600;
        const expectedUpdatedAt = options?.expectedUpdatedAt;
        const expectedProfileImageUrl = options?.expectedProfileImageUrl;
        const expectedBackgroundImageUrl = options?.expectedBackgroundImageUrl;
        const expectedDate = expectedUpdatedAt ? new Date(expectedUpdatedAt) : null;
        const normalizedExpectedProfileImageUrl = expectedProfileImageUrl === undefined
            ? undefined
            : normalizeImageValue(expectedProfileImageUrl);
        const normalizedExpectedBackgroundImageUrl = expectedBackgroundImageUrl === undefined
            ? undefined
            : normalizeImageValue(expectedBackgroundImageUrl);

        let lastProfile: UserData | null = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            const profileResult = await authService.getMyProfileFull();
            if (profileResult.success && profileResult.data) {
                const profile = profileResult.data;
                const mergedUser: UserData = {
                    userId: profile.userId ?? profile.id ?? user?.userId ?? '',
                    username: profile.username ?? user?.username ?? '',
                    email: profile.email ?? user?.email ?? '',
                    firstName: profile.firstName ?? user?.firstName,
                    lastName: profile.lastName ?? user?.lastName,
                    roleId: profile.roleId ?? user?.roleId,
                    roleName: profile.roleName ?? user?.roleName,
                    isActive: profile.isActive ?? user?.isActive ?? true,
                    createdAt: profile.createdAt ?? user?.createdAt,
                    updatedAt: profile.updatedAt ?? user?.updatedAt,
                    bio: profile.bio ?? user?.bio,
                    phone: profile.phone ?? user?.phone,
                    gender: profile.gender ?? user?.gender,
                    dateOfBirth: profile.dateOfBirth ?? user?.dateOfBirth,
                    profileImageUrl: profile.profileImageUrl !== undefined
                        ? profile.profileImageUrl
                        : user?.profileImageUrl,
                    backgroundImageUrl: profile.backgroundImageUrl !== undefined
                        ? profile.backgroundImageUrl
                        : user?.backgroundImageUrl,
                    location: profile.location ?? user?.location,
                    website: profile.website ?? user?.website,
                };

                lastProfile = mergedUser;

                if (!expectedUpdatedAt) {
                    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mergedUser));
                    setUserState(mergedUser);
                    return;
                }

                const profileDate = new Date(profile.updatedAt || '');
                const profileImageMatched = normalizedExpectedProfileImageUrl === undefined
                    || normalizeImageValue(profile.profileImageUrl) === normalizedExpectedProfileImageUrl;
                const backgroundImageMatched = normalizedExpectedBackgroundImageUrl === undefined
                    || normalizeImageValue(profile.backgroundImageUrl) === normalizedExpectedBackgroundImageUrl;
                const expectedImageMatched = profileImageMatched && backgroundImageMatched;

                if (expectedDate && !Number.isNaN(expectedDate.getTime()) && !Number.isNaN(profileDate.getTime())) {
                    if (profileDate.getTime() >= expectedDate.getTime() && expectedImageMatched) {
                        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mergedUser));
                        setUserState(mergedUser);
                        return;
                    }
                }
            }

            if (attempt < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
            }
        }

        if (lastProfile) {
            const profileImageMatched = normalizedExpectedProfileImageUrl === undefined
                || normalizeImageValue(lastProfile.profileImageUrl) === normalizedExpectedProfileImageUrl;
            const backgroundImageMatched = normalizedExpectedBackgroundImageUrl === undefined
                || normalizeImageValue(lastProfile.backgroundImageUrl) === normalizedExpectedBackgroundImageUrl;
            const expectedImageMatched = profileImageMatched && backgroundImageMatched;

            if (expectedDate && !Number.isNaN(expectedDate.getTime())) {
                const lastProfileDate = new Date(lastProfile.updatedAt || '');
                if (
                    Number.isNaN(lastProfileDate.getTime())
                    || lastProfileDate.getTime() < expectedDate.getTime()
                    || !expectedImageMatched
                ) {
                    // Keep the current local state when backend read model is still stale.
                    return;
                }
            }

            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(lastProfile));
            setUserState(lastProfile);
        }
    }, [user]);

    return (
        <UserContext.Provider value={{ user, setUser, saveUser, clearUser, refreshUser, isLoading }}>
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
