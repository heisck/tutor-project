export declare const AUTH_PATHS: {
    readonly csrf: "/api/v1/auth/csrf";
    readonly signup: "/api/v1/auth/signup";
    readonly signin: "/api/v1/auth/signin";
    readonly signout: "/api/v1/auth/signout";
    readonly session: "/api/v1/auth/session";
    readonly googleOauthStart: "/api/v1/auth/oauth/google";
    readonly googleOauthCallback: "/api/v1/auth/oauth/callback";
};
export declare const AUTH_HEADER_NAMES: {
    readonly csrf: "x-csrf-token";
};
export type AuthProvider = 'email' | 'google';
export type UserRole = 'student' | 'admin';
export interface AuthenticatedUser {
    id: string;
    email: string;
    authProvider: AuthProvider;
    emailVerified: boolean;
    role: UserRole;
    username: string | null;
}
export interface AuthSessionResponse {
    csrfToken: string;
    expiresAt: string;
    user: AuthenticatedUser;
}
export interface CsrfTokenResponse {
    csrfToken: string;
}
export interface OauthAuthorizationUrlResponse {
    authorizationUrl: string;
}
//# sourceMappingURL=auth.d.ts.map
