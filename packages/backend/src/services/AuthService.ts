import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import sequelizeConnection from '../sequelize';
import {Company} from '../sequelize/models/Company';
import {Student} from '../sequelize/models/Student';
import {User, UserRole} from '../sequelize/models/User';

export interface LoginResult {
  token: string;
  user: {
    id: number;
    role: UserRole;
    email: string;
    company?: {id: number; name: string} | null;
    student?: {id: number; name: string} | null;
  };
}

export interface RegisterStudentPayload {
  email: string;
  password: string;
  name: string;
  headline?: string;
  phone?: string;
  location?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  bio?: string;
}

export interface RegisterCompanyPayload {
  email: string;
  password: string;
  name: string;
  location?: string;
  websiteUrl?: string;
}

export interface RegisterCompanyResult {
  status: 'pending_approval';
  message: string;
  company: {id: number; name: string};
}

export const COMPANY_LOGIN_PENDING_MESSAGE =
  'Company registration is pending admin approval. Please contact admins by phone or email.';
export const COMPANY_LOGIN_REJECTED_MESSAGE =
  'Company registration was rejected. Please contact admins by phone or email.';

export class AuthService {
  private readonly jwtSecret = process.env['JWT_SECRET_KEY'] || 'dev-secret-change-me';

  async login(role: UserRole, email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({where: {email: normalizedEmail, role}});
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new Error('Invalid email or password.');
    }

    let company: {id: number; name: string} | null = null;
    let student: {id: number; name: string} | null = null;

    if (user.role === 'company') {
      const c = await Company.findOne({where: {userId: user.id}});
      if (c?.registrationStatus === 'pending') {
        throw new Error(COMPANY_LOGIN_PENDING_MESSAGE);
      }
      if (c?.registrationStatus === 'rejected') {
        throw new Error(COMPANY_LOGIN_REJECTED_MESSAGE);
      }
      if (c) company = {id: c.id, name: c.name};
    } else if (user.role === 'student') {
      const s = await Student.findOne({where: {userId: user.id}});
      if (s) student = {id: s.id, name: s.name};
    }

    return this.issueToken(user, {company, student});
  }

  async me(userId: number): Promise<Omit<LoginResult, 'token'>> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found.');

    let company: {id: number; name: string} | null = null;
    let student: {id: number; name: string} | null = null;

    if (user.role === 'company') {
      const c = await Company.findOne({where: {userId: user.id}});
      if (c) company = {id: c.id, name: c.name};
    } else if (user.role === 'student') {
      const s = await Student.findOne({where: {userId: user.id}});
      if (s) student = {id: s.id, name: s.name};
    }

    return {
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        company,
        student,
      },
    };
  }

  async registerStudent(payload: RegisterStudentPayload): Promise<LoginResult> {
    const email = payload.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(payload.password, 10);

    return await sequelizeConnection.transaction(async (t) => {
      const existing = await User.findOne({where: {email}, transaction: t});
      if (existing) throw new Error('Email is already in use.');

      const user = await User.create(
        {email, passwordHash, role: 'student'},
        {transaction: t},
      );

      const student = await Student.create(
        {
          userId: user.id,
          name: payload.name.trim(),
          headline: (payload.headline ?? '').trim(),
          phone: payload.phone?.trim() || null,
          location: (payload.location ?? '').trim(),
          linkedInUrl: payload.linkedInUrl?.trim() || null,
          githubUrl: payload.githubUrl?.trim() || null,
          bio: payload.bio?.trim() || null,
          seekingJob: false,
          seekingInternship: false,
        },
        {transaction: t},
      );

      // Auto-login after register
      return this.issueToken(user, {student: {id: student.id, name: student.name}, company: null});
    });
  }

  async registerCompany(payload: RegisterCompanyPayload): Promise<RegisterCompanyResult> {
    const email = payload.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(payload.password, 10);

    return await sequelizeConnection.transaction(async (t) => {
      const existing = await User.findOne({where: {email}, transaction: t});
      if (existing) throw new Error('Email is already in use.');

      const user = await User.create(
        {email, passwordHash, role: 'company'},
        {transaction: t},
      );

      const company = await Company.create(
        {
          userId: user.id,
          name: payload.name.trim(),
          location: (payload.location ?? 'Remote').trim() || 'Remote',
          websiteUrl: payload.websiteUrl?.trim() || null,
          registrationStatus: 'pending',
        },
        {transaction: t},
      );

      return {
        status: 'pending_approval',
        message: 'Company registration submitted. Please contact admins by phone or email for approval.',
        company: {id: company.id, name: company.name},
      };
    });
  }

  private issueToken(
    user: User,
    extras: {company: {id: number; name: string} | null; student: {id: number; name: string} | null},
  ): LoginResult {
    const payload: any = {
      sub: user.id,
      role: user.role,
      email: user.email,
      companyId: extras.company?.id ?? null,
      studentId: extras.student?.id ?? null,
    };
    const token = jwt.sign(payload, this.jwtSecret, {expiresIn: '1d'});
    return {
      token,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        company: extras.company,
        student: extras.student,
      },
    };
  }
}
