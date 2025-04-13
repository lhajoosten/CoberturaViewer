// user.interface.ts
export interface User {
    id: string;
    login?: string;
    name: string;
    email: string;
    avatar?: string;
    provider: 'github';
    roles: string[];
    accessToken?: string;
    // GitHub-specific fields
    bio?: string;
    location?: string;
    company?: string;
    profileUrl?: string;
    createdAt?: string;
    followers?: number;
    following?: number;
    publicRepos?: number;
    publicGists?: number;

    // Additional fields can be added here
    updatedAt?: string;
    lastLogin?: string;
}

// Add a new interface for user preferences
export interface UserPreferences {
    emailNotifications: boolean;
    autoSaveReports: boolean;
    darkMode: boolean;
    language: 'en' | 'es' | 'fr' | 'de';
    dashboardLayout: 'compact' | 'comfortable' | 'spacious';
    sessionTimeout: 'never' | '15m' | '30m' | '1h' | '2h';
}