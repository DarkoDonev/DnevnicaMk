const refreshTokens = new Map<string, number>();

export class RefreshTokenService {
    public async getRefreshToken(refreshToken: string) {
        return refreshTokens.get(refreshToken) ?? null;
    }

    public async add(refreshToken: string, userId: number) {
        refreshTokens.set(refreshToken, userId);
    }

    public async remove(refreshToken: string) {
        refreshTokens.delete(refreshToken);
    }
}
