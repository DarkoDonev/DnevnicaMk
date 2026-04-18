export interface LoginBody {
    email: string;
    password: string;
    recaptchaToken: string;
}

export interface RegisterBody extends LoginBody {
    firstName: string;
    lastName: string;
    organisationName?: string;
}

export interface AuthenticationBody {
    accessToken: string;
    refreshToken: string;
}

export interface SetPasswordBody {
    email: string,
    newPassword: string;
    confirmPassword: string;
}

export interface ForgotPasswordBody {
    email: string;
    recaptchaToken: string;
}

export interface RegisterResponse {
    message: string;
}

export interface SetPasswordWithTokenBody {
    token: string;
    newPassword: string;
}

export interface ChangePasswordBody {
    oldPassword: string;
    newPassword: string;
}
