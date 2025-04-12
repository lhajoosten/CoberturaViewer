export interface User {
    id: string;
    login?: string;
    name: string;
    email: string;
    avatar?: string;
    provider: 'github';
    roles: string[];
    accessToken?: string;
}