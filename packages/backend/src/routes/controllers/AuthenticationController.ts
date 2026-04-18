import {
    Authorized,
    Body,
    CurrentUser,
    Get,
    HttpError,
    JsonController,
    OnUndefined,
    Post,
    QueryParam
} from 'routing-controllers';
import * as bcrypt from 'bcryptjs';
import {Role} from '../../sequelize/models/Role';
import {User} from '../../sequelize/models/User';
import {createToken, getParsedRefreshToken} from '../../utils/jwtUtils';
import {RefreshTokenService} from '../../services/RefreshTokenService';
import {encryptPassword} from '../../utils/encrypt-password';
import {
    AuthenticationBody,
    ChangePasswordBody,
    ForgotPasswordBody,
    LoginBody,
    RegisterBody,
    RegisterResponse,
    SetPasswordWithTokenBody
} from '../../types/authentication-controller-types';

@JsonController('/api/auth')
export class AuthenticationController {
    private refreshTokenService = new RefreshTokenService();

    @OnUndefined(204)
    @Post('/logout')
    async logout(@Body({required: true}) body: AuthenticationBody) {
        await this.refreshTokenService.remove(body.refreshToken);
    }

    @Post('/login')
    async login(@Body({required: true}) body: LoginBody) {
        const user = await User.unscoped().findOne({
            where: {
                email: body.email.trim().toLowerCase()
            },
            include: [{model: Role, as: 'role'}]
        });

        if (!user) {
            throw new HttpError(401, 'Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(body.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new HttpError(401, 'Invalid credentials');
        }

        const authData = createToken(user);
        await this.refreshTokenService.add(authData.refreshToken, user.id);
        return authData;
    }

    @Post('/register')
    async register(@Body({required: true}) body: RegisterBody): Promise<RegisterResponse> {
        if (!this.validatePasswordStrength(body.password)) {
            throw new HttpError(
                400,
                'Password must be at least 8 characters, include uppercase, lowercase, number, and special character'
            );
        }

        const existingUser = await User.findOne({
            where: {
                email: body.email.trim().toLowerCase()
            }
        });

        if (existingUser) {
            throw new HttpError(400, 'Email address is already in use!');
        }

        const role = await Role.create({name: 'USER'});

        await User.create({
            firstName: body.firstName.trim(),
            lastName: body.lastName.trim(),
            email: body.email.trim().toLowerCase(),
            passwordHash: await encryptPassword(body.password),
            isEmailVerified: true,
            roleId: role.id
        });

        return {message: 'User registered successfully'};
    }

    @Post('/refresh-token')
    async refreshToken(@Body({required: true}) body: AuthenticationBody) {
        const tokenData = await getParsedRefreshToken(body.refreshToken);
        if (!tokenData) {
            throw new HttpError(401, 'invalid token');
        }

        const currentUser = await User.unscoped().findOne({
            where: {
                id: tokenData.id,
                email: tokenData.email
            },
            include: [{model: Role, as: 'role'}]
        });
        if (!currentUser) {
            throw new HttpError(401, 'invalid token');
        }

        const storedRefreshOwnerId = await this.refreshTokenService.getRefreshToken(body.refreshToken);
        if (!storedRefreshOwnerId || storedRefreshOwnerId !== currentUser.id) {
            throw new HttpError(401, 'invalid token');
        }

        await this.refreshTokenService.remove(body.refreshToken);
        const authData = createToken(currentUser);
        await this.refreshTokenService.add(authData.refreshToken, currentUser.id);
        return authData;
    }

    // Compatibility endpoints from the original auth contract.
    @OnUndefined(204)
    @Get('/activate')
    async activateAccount(@QueryParam('code') _code: string) {
    }

    @OnUndefined(204)
    @Post('/resend-activation')
    async resendActivationEmail() {
    }

    @OnUndefined(204)
    @Post('/set-password')
    async setPassword(@Body({required: true}) _body: SetPasswordWithTokenBody) {
    }

    @OnUndefined(204)
    @Post('/forgot-password')
    async forgotPassword(@Body({required: true}) _body: ForgotPasswordBody) {
    }

    @OnUndefined(204)
    @Authorized()
    @Post('/change-password')
    async changePassword(@Body({required: true}) body: ChangePasswordBody, @CurrentUser() user: { id: number }) {
        const userWithPassword = await User.unscoped().findByPk(user.id);
        if (!userWithPassword) {
            throw new HttpError(404, 'User not found');
        }

        const isOldPasswordValid = await bcrypt.compare(body.oldPassword, userWithPassword.passwordHash);
        if (!isOldPasswordValid) {
            throw new HttpError(400, 'The old password is not correct!');
        }

        if (!this.validatePasswordStrength(body.newPassword)) {
            throw new HttpError(
                400,
                'Password must be at least 8 characters, include uppercase, lowercase, number, and special character'
            );
        }

        await userWithPassword.update({
            passwordHash: await encryptPassword(body.newPassword)
        });
    }

    // Min 8 chars, at least one uppercase, one lowercase, one number, one special.
    private validatePasswordStrength(password: string) {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+]).{8,}$/;
        return regex.test(password);
    }
}
