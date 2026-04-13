import * as client from 'openid-client';
import { z } from 'zod';

import type { ApiEnv } from '../../config/env.js';

export interface GoogleOauthAuthorizationRequest {
  authorizationUrl: string;
}

export interface GoogleOauthProfile {
  email: string;
  emailVerified: boolean;
  googleSubject: string;
}

export interface GoogleOauthClient {
  createAuthorizationUrl(input: {
    codeVerifier: string;
    state: string;
  }): Promise<GoogleOauthAuthorizationRequest>;
  exchangeCode(input: {
    code: string;
    codeVerifier: string;
    state: string;
  }): Promise<GoogleOauthProfile>;
}

export function createOauthState(): string {
  return client.randomState();
}

export function createCodeVerifier(): string {
  return client.randomPKCECodeVerifier();
}

class OpenIdGoogleOauthClient implements GoogleOauthClient {
  private readonly env: Pick<
    ApiEnv,
    'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GOOGLE_REDIRECT_URI'
  >;

  private configurationPromise: Promise<client.Configuration> | null = null;

  public constructor(
    env: Pick<
      ApiEnv,
      'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GOOGLE_REDIRECT_URI'
    >,
  ) {
    this.env = env;
  }

  public async createAuthorizationUrl(input: {
    codeVerifier: string;
    state: string;
  }): Promise<GoogleOauthAuthorizationRequest> {
    const configuration = await this.getConfiguration();
    const codeChallenge = await client.calculatePKCECodeChallenge(
      input.codeVerifier,
    );

    const authorizationUrl = client.buildAuthorizationUrl(configuration, {
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: this.env.GOOGLE_REDIRECT_URI,
      scope: 'openid email profile',
      state: input.state,
    });

    return {
      authorizationUrl: authorizationUrl.toString(),
    };
  }

  public async exchangeCode(input: {
    code: string;
    codeVerifier: string;
    state: string;
  }): Promise<GoogleOauthProfile> {
    const configuration = await this.getConfiguration();
    const callbackUrl = new URL(this.env.GOOGLE_REDIRECT_URI);
    callbackUrl.searchParams.set('code', input.code);
    callbackUrl.searchParams.set('state', input.state);

    const tokenResponse = await client.authorizationCodeGrant(
      configuration,
      callbackUrl,
      {
        expectedState: input.state,
        pkceCodeVerifier: input.codeVerifier,
      },
    );

    const userInfoEndpoint = configuration.serverMetadata().userinfo_endpoint;

    if (userInfoEndpoint === undefined) {
      throw new Error('Google OAuth configuration is missing userinfo_endpoint');
    }

    const userInfoResponse = await client.fetchProtectedResource(
      configuration,
      tokenResponse.access_token,
      new URL(userInfoEndpoint),
      'GET',
    );
    const userInfo = googleUserInfoSchema.parse(await userInfoResponse.json());

    return {
      email: userInfo.email,
      emailVerified: userInfo.email_verified,
      googleSubject: userInfo.sub,
    };
  }

  private async getConfiguration(): Promise<client.Configuration> {
    if (this.configurationPromise === null) {
      this.configurationPromise = client.discovery(
        new URL('https://accounts.google.com'),
        this.env.GOOGLE_CLIENT_ID,
        this.env.GOOGLE_CLIENT_SECRET,
      );
    }

    return this.configurationPromise;
  }
}

const googleUserInfoSchema = z.object({
  email: z.string().email(),
  email_verified: z.boolean(),
  sub: z.string().min(1),
});

export function createGoogleOauthClient(
  env: Pick<
    ApiEnv,
    'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GOOGLE_REDIRECT_URI'
  >,
): GoogleOauthClient {
  return new OpenIdGoogleOauthClient(env);
}
