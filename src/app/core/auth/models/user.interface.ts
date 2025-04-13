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
}

// Add a new interface for user preferences
export interface UserPreferences {
    emailNotifications: boolean;
    autoSaveReports: boolean;
    darkMode: boolean;
    language: 'en' | 'es' | 'fr' | 'de';
    dashboardLayout: 'compact' | 'comfortable' | 'spacious';
}