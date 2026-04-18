import {
  Authorized,
  BadRequestError,
  Body,
  CurrentUser,
  Delete,
  Get,
  JsonController,
  NotFoundError,
  Param,
  Put,
} from 'routing-controllers';
import {IsInt, IsOptional, IsString, Max, Min, MinLength} from 'class-validator';
import {UploadedFile} from 'routing-controllers';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import {Student} from '../../sequelize/models/Student';
import {StudentSkill} from '../../sequelize/models/StudentSkill';
import {TechSkill} from '../../sequelize/models/TechSkill';
import {User} from '../../sequelize/models/User';
import {safeFilename} from '../../utils/safe-filename';

class UpsertSkillBody {
  @IsString()
  skillName!: string;

  @IsInt()
  @Min(0)
  @Max(50)
  yearsOfExperience!: number;
}

class UpdateMeBody {
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

@JsonController('/api/students')
export class StudentsController {
  // Company directory
  @Authorized('company')
  @Get('')
  async list() {
    const students = await Student.findAll({
      include: [
        {model: User, attributes: ['email']},
        {
          model: StudentSkill,
          attributes: ['yearsOfExperience'],
          include: [{model: TechSkill, attributes: ['name']}],
        },
      ],
      order: [['name', 'ASC']],
    });

    return {
      data: students.map((s) => ({
        id: s.id,
        name: s.name,
        headline: s.headline,
        contact: {
          email: (s.user as any)?.email ?? '',
          phone: s.phone ?? '',
          location: s.location ?? '',
          linkedInUrl: s.linkedInUrl ?? undefined,
          githubUrl: s.githubUrl ?? undefined,
        },
        bio: s.bio ?? undefined,
        cvUrl: s.cvPath ? `/static/${s.cvPath}` : undefined,
        skills: (s.studentSkills ?? []).map((ss) => ({
          skillName: (ss.techSkill as any)?.name ?? '',
          yearsOfExperience: ss.yearsOfExperience,
        })),
      })),
    };
  }

  // Student self profile
  @Authorized('student')
  @Get('/me')
  async me(@CurrentUser() user: any) {
    const student = await Student.findOne({
      where: {userId: user.sub},
      include: [
        {model: User, attributes: ['email']},
        {
          model: StudentSkill,
          attributes: ['yearsOfExperience'],
          include: [{model: TechSkill, attributes: ['name']}],
        },
      ],
    });

    if (!student) throw new NotFoundError('Student not found.');

    return {
      data: {
        id: student.id,
        name: student.name,
        headline: student.headline,
        contact: {
          email: (student.user as any)?.email ?? '',
          phone: student.phone ?? '',
          location: student.location ?? '',
          linkedInUrl: student.linkedInUrl ?? undefined,
          githubUrl: student.githubUrl ?? undefined,
        },
        bio: student.bio ?? undefined,
        cvUrl: student.cvPath ? `/static/${student.cvPath}` : undefined,
        skills: (student.studentSkills ?? []).map((ss) => ({
          skillName: (ss.techSkill as any)?.name ?? '',
          yearsOfExperience: ss.yearsOfExperience,
        })),
      },
    };
  }

  @Authorized('student')
  @Put('/me')
  async updateMe(@CurrentUser() user: any, @Body() body: UpdateMeBody) {
    const student = await Student.findOne({where: {userId: user.sub}, include: [{model: User, attributes: ['email']}]});
    if (!student) throw new NotFoundError('Student not found.');

    student.name = body.name.trim();
    student.headline = (body.headline ?? '').trim();
    student.phone = body.phone?.trim() || null;
    student.location = (body.location ?? '').trim();
    student.linkedInUrl = body.linkedInUrl?.trim() || null;
    student.githubUrl = body.githubUrl?.trim() || null;
    student.bio = body.bio?.trim() || null;
    await student.save();

    return this.me(user);
  }

  @Authorized('student')
  @Put('/me/cv')
  async uploadCv(
    @CurrentUser() user: any,
    @UploadedFile('cv', {
      options: multer({
        storage: multer.memoryStorage(),
        limits: {fileSize: 10 * 1024 * 1024}, // 10MB
      }),
    })
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestError('Missing file field "cv".');

    const allowed = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestError('CV must be PDF, DOC, or DOCX.');
    }

    const student = await Student.findOne({where: {userId: user.sub}});
    if (!student) throw new NotFoundError('Student not found.');

    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeOrig = safeFilename(file.originalname || 'cv');
    const fileName = `cv_${student.id}_${Date.now()}${ext || ''}`;

    // Stored under backend/static/uploads/cv/<studentId>/
    const relDir = path.join('uploads', 'cv', String(student.id));
    const relPath = path.join(relDir, fileName);
    const absDir = path.resolve(__dirname, '../../../static', relDir);
    const absPath = path.resolve(__dirname, '../../../static', relPath);

    fs.mkdirSync(absDir, {recursive: true});
    fs.writeFileSync(absPath, file.buffer);

    student.cvPath = relPath.replace(/\\/g, '/');
    student.cvOriginalName = safeOrig;
    await student.save();

    return this.me(user);
  }

  @Authorized('student')
  @Put('/me/skills')
  async upsertSkill(@CurrentUser() user: any, @Body() body: UpsertSkillBody) {
    const student = await Student.findOne({where: {userId: user.sub}});
    if (!student) throw new NotFoundError('Student not found.');

    const tech = await TechSkill.findOne({where: {name: body.skillName}});
    if (!tech) throw new NotFoundError('Skill not found.');

    const existing = await StudentSkill.findOne({
      where: {studentId: student.id, techSkillId: tech.id},
    });

    if (!existing) {
      await StudentSkill.create({
        studentId: student.id,
        techSkillId: tech.id,
        yearsOfExperience: body.yearsOfExperience,
      });
    } else {
      existing.yearsOfExperience = body.yearsOfExperience;
      await existing.save();
    }

    return this.me(user);
  }

  @Authorized('student')
  @Delete('/me/skills/:skillName')
  async removeSkill(@CurrentUser() user: any, @Param('skillName') skillName: string) {
    const student = await Student.findOne({where: {userId: user.sub}});
    if (!student) throw new NotFoundError('Student not found.');

    const tech = await TechSkill.findOne({where: {name: skillName}});
    if (!tech) throw new NotFoundError('Skill not found.');

    await StudentSkill.destroy({where: {studentId: student.id, techSkillId: tech.id}});

    return this.me(user);
  }
}
