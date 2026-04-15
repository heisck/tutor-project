export const AUTH_PATHS = {
  csrf: '/api/v1/auth/csrf',
  signup: '/api/v1/auth/signup',
  signin: '/api/v1/auth/signin',
  signout: '/api/v1/auth/signout',
  session: '/api/v1/auth/session',
  googleOauthStart: '/api/v1/auth/oauth/google',
  googleOauthCallback: '/api/v1/auth/oauth/callback',
} as const;

export const AUTH_HEADER_NAMES = {
  csrf: 'x-csrf-token',
} as const;

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
