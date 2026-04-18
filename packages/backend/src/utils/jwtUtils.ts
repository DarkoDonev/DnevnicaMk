import jwt, {Algorithm} from 'jsonwebtoken';
import {AuthenticationBody} from '../types/authentication-controller-types';
import {User} from '../sequelize/models/User';

export interface TokenData {
    id: number;
    email: string;
}

const accessSecret = process.env['JWT_SECRET_KEY'] || 'dnevnicamk-access-secret';
const refreshSecret = process.env['JWT_REFRESH_SECRET'] || 'dnevnicamk-refresh-secret';
const accessExpiration = process.env['JWT_ACCESS_EXPIRATION'] || '15m';
const refreshExpiration = process.env['JWT_REFRESH_EXPIRATION'] || '168h';

const accessSigningOptions = {
    expiresIn: accessExpiration,
    issuer: 'access-dnevnicamk',
    algorithm: 'HS256' as Algorithm,
};

const refreshSigningOptions = {
    expiresIn: refreshExpiration,
    issuer: 'refresh-dnevnicamk',
    algorithm: 'HS256' as Algorithm,
};

export async function getParsedAuthorizationHeader(authorizationHeader?: string): Promise<TokenData | null> {
    if (!authorizationHeader) {
        return null;
    }

    const tokenMatch = /Bearer (.+)/.exec(authorizationHeader);
    if (!tokenMatch) {
        return null;
    }

    return getParsedToken(tokenMatch[1]);
}

export function createToken(user: User): AuthenticationBody {
    const tokenData: TokenData = {
        id: user.id,
        email: user.email
    };

    return {
        accessToken: jwt.sign(tokenData, accessSecret, accessSigningOptions),
        refreshToken: jwt.sign(tokenData, refreshSecret, refreshSigningOptions)
    };
}

export async function getParsedToken(token: string): Promise<TokenData | null> {
    return new Promise((resolve) => jwt.verify(token, accessSecret, {
        issuer: accessSigningOptions.issuer
    }, (err, parsedToken) => {
        if (err) {
            resolve(null);
            return;
        }
        resolve(parsedToken as TokenData);
    }));
}

export async function getParsedRefreshToken(refreshToken: string): Promise<TokenData | null> {
    return new Promise((resolve) => jwt.verify(refreshToken, refreshSecret, {
        issuer: refreshSigningOptions.issuer
    }, (err, parsedToken) => {
        if (err) {
            resolve(null);
            return;
        }
        resolve(parsedToken as TokenData);
    }));
}
