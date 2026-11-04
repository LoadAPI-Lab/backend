export const OAuthProvider = {
    GOOGLE: 'google',
    GITHUB: 'github',
} as const;
export type OAuthProvider = (typeof OAuthProvider)[keyof typeof OAuthProvider];

export const OAUTH_PROVIDERS = [OAuthProvider.GOOGLE, OAuthProvider.GITHUB] as const;

export const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = {
    [OAuthProvider.GOOGLE]: 'Google',
    [OAuthProvider.GITHUB]: 'GitHub',
};

export const isOAuthProvider = (value: unknown): value is OAuthProvider =>
    (OAUTH_PROVIDERS as readonly unknown[]).includes(value);
