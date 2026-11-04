import type { TokenType } from '../constants';
import type { Session } from '../session';

export interface TokenPair {
    readonly accessToken: string;
    readonly refreshToken: string;
}

export interface AccessTokenClaims {
    readonly sub: string;
    readonly sid: string;
    readonly typ: typeof TokenType.ACCESS;
}

export interface RefreshTokenClaims {
    readonly sub: string;
    readonly sid: string;
    readonly jti: string;
    readonly typ: typeof TokenType.REFRESH;
}

export abstract class TokenService {
    abstract issuePair(session: Session): Promise<TokenPair>;
    abstract verifyAccess(token: string): Promise<AccessTokenClaims | null>;
    abstract verifyRefresh(token: string): Promise<RefreshTokenClaims | null>;
}
