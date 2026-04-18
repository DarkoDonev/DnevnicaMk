import {Authorized, BadRequestError, Body, CurrentUser, Get, JsonController, Post, UnauthorizedError} from 'routing-controllers';
import {IsEmail, IsIn, IsOptional, IsString, MinLength} from 'class-validator';

import {AuthService} from '../../services/AuthService';
import {UserRole} from '../../sequelize/models/User';

class LoginBody {
  @IsIn(['student', 'company'])
  role!: UserRole;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class RegisterStudentBody {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  linkedInUrl?: string;

  @IsOptional()
  @IsString()
  githubUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}

class RegisterCompanyBody {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;
}

@JsonController('/api/auth')
export class AuthController {
  private readonly auth = new AuthService();

  @Post('/login')
  async login(@Body() body: LoginBody) {
    try {
      return await this.auth.login(body.role, body.email, body.password);
    } catch (e: any) {
      // Avoid account enumeration and keep a stable error message.
      throw new UnauthorizedError('Invalid email or password.');
    }
  }

  @Post('/register/student')
  async registerStudent(@Body() body: RegisterStudentBody) {
    try {
      return await this.auth.registerStudent(body);
    } catch (e: any) {
      throw new BadRequestError(e?.message || 'Could not register.');
    }
  }

  @Post('/register/company')
  async registerCompany(@Body() body: RegisterCompanyBody) {
    try {
      return await this.auth.registerCompany(body);
    } catch (e: any) {
      throw new BadRequestError(e?.message || 'Could not register.');
    }
  }

  @Get('/me')
  @Authorized()
  async me(@CurrentUser() user: any) {
    if (!user) throw new UnauthorizedError('Missing or invalid token.');
    // Reuse login-shaped payload (token omitted).
    const result = await this.auth.me(user.sub);
    return {data: result.user};
  }
}
