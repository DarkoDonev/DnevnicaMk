import {
  Authorized,
  BadRequestError,
  Body,
  CurrentUser,
  Get,
  JsonController,
  NotFoundError,
  Param,
  Patch,
  Post,
  UnauthorizedError,
} from 'routing-controllers';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {Type} from 'class-transformer';
import {UniqueConstraintError} from 'sequelize';

import sequelizeConnection from '../../sequelize';
import {Company} from '../../sequelize/models/Company';
import {ApplicationStatus, JobApplication} from '../../sequelize/models/JobApplication';
import {Job} from '../../sequelize/models/Job';
import {JobRequirement} from '../../sequelize/models/JobRequirement';
import {Student} from '../../sequelize/models/Student';
import {TechSkill} from '../../sequelize/models/TechSkill';
import {User} from '../../sequelize/models/User';

const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'APPLIED',
  'APPROVED',
  'HR_INTERVIEW',
  'TECHNICAL_INTERVIEW',
  'REJECTED',
];

const APPLICATION_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  APPLIED: ['APPROVED', 'REJECTED'],
  APPROVED: ['HR_INTERVIEW', 'TECHNICAL_INTERVIEW', 'REJECTED'],
  HR_INTERVIEW: ['TECHNICAL_INTERVIEW', 'REJECTED'],
  TECHNICAL_INTERVIEW: ['HR_INTERVIEW', 'REJECTED'],
  REJECTED: [],
};

class RequirementBody {
  @IsString()
  skillName!: string;

  @IsInt()
  @Min(0)
  @Max(50)
  minYears!: number;
}

class CreateJobBody {
  @IsString()
  @MinLength(4)
  title!: string;

  @IsString()
  @MinLength(2)
  location!: string;

  @IsIn(['Remote', 'Hybrid', 'On-site'])
  workMode!: 'Remote' | 'Hybrid' | 'On-site';

  @IsString()
  @MinLength(20)
  description!: string;

  @IsOptional()
  @IsBoolean()
  isJob?: boolean;

  @IsOptional()
  @IsBoolean()
  isInternship?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({each: true})
  @Type(() => RequirementBody)
  requirements!: RequirementBody[];
}

class UpdateApplicationStatusBody {
  @IsIn(APPLICATION_STATUSES as string[])
  status!: ApplicationStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

function mapJob(j: Job) {
  return {
    id: j.id,
    companyId: j.companyId,
    companyName: (j.company as any)?.name ?? '',
    title: j.title,
    location: j.location,
    workMode: j.workMode,
    isJob: !!j.isJob,
    isInternship: !!j.isInternship,
    description: j.description,
    postedAtIso: j.postedAt.toISOString(),
    requirements: (j.requirements ?? []).map((r) => ({
      skillName: (r.techSkill as any)?.name ?? '',
      minYears: r.minYears,
    })),
  };
}

function mapJobApplication(app: JobApplication, includeStudent: boolean) {
  const job = app.job as any;
  const student = app.student as any;
  const mapped: any = {
    id: app.id,
    status: app.status,
    rejectionReason: app.rejectionReason || undefined,
    createdAtIso: app.createdAt.toISOString(),
    updatedAtIso: app.updatedAt.toISOString(),
    job: {
      id: job?.id ?? app.jobId,
      companyId: job?.companyId,
      companyName: job?.company?.name ?? '',
      title: job?.title ?? '',
      location: job?.location ?? '',
      workMode: job?.workMode,
      isJob: !!job?.isJob,
      isInternship: !!job?.isInternship,
      postedAtIso: job?.postedAt?.toISOString?.() ?? '',
    },
  };
  if (includeStudent) {
    mapped.student = {
      id: student?.id ?? app.studentId,
      name: student?.name ?? '',
      email: student?.user?.email ?? '',
    };
  }
  return mapped;
}

@JsonController('/api/jobs')
export class JobsController {
  @Authorized()
  @Get('')
  async listAll() {
    const jobs = await Job.findAll({
      include: [
        {model: Company, attributes: ['id', 'name', 'location', 'websiteUrl']},
        {
          model: JobRequirement,
          attributes: ['minYears'],
          include: [{model: TechSkill, attributes: ['name']}],
        },
      ],
      order: [['postedAt', 'DESC']],
    });

    return {
      data: jobs.map((j) => mapJob(j)),
    };
  }

  @Authorized('company')
  @Get('/company')
  async listForCompany(@CurrentUser() user: any) {
    const company = await Company.findOne({where: {userId: user.sub}});
    if (!company) throw new UnauthorizedError('Not a company.');

    const jobs = await Job.findAll({
      where: {companyId: company.id},
      include: [
        {model: Company, attributes: ['id', 'name']},
        {
          model: JobRequirement,
          attributes: ['minYears'],
          include: [{model: TechSkill, attributes: ['name']}],
        },
      ],
      order: [['postedAt', 'DESC']],
    });

    return {
      data: jobs.map((j) => mapJob(j)),
    };
  }

  @Authorized('company')
  @Get('/company/applications')
  async listCompanyApplications(@CurrentUser() user: any) {
    const company = await this.requireCompany(user);

    const applications = await JobApplication.findAll({
      include: [
        {
          model: Job,
          where: {companyId: company.id},
          attributes: ['id', 'companyId', 'title', 'location', 'workMode', 'isJob', 'isInternship', 'postedAt'],
          include: [{model: Company, attributes: ['id', 'name']}],
        },
        {
          model: Student,
          attributes: ['id', 'name'],
          include: [{model: User, attributes: ['email']}],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    return {
      data: applications.map((a) => mapJobApplication(a, true)),
    };
  }

  @Authorized('company')
  @Patch('/company/applications/:applicationId/status')
  async updateApplicationStatus(
    @CurrentUser() user: any,
    @Param('applicationId') applicationIdParam: string,
    @Body() body: UpdateApplicationStatusBody,
  ) {
    const company = await this.requireCompany(user);
    const applicationId = Number(applicationIdParam);
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      throw new BadRequestError('Invalid application id.');
    }

    const application = await JobApplication.findByPk(applicationId, {
      include: [
        {
          model: Job,
          attributes: ['id', 'companyId', 'title', 'location', 'workMode', 'isJob', 'isInternship', 'postedAt'],
          include: [{model: Company, attributes: ['id', 'name']}],
        },
        {
          model: Student,
          attributes: ['id', 'name'],
          include: [{model: User, attributes: ['email']}],
        },
      ],
    });

    if (!application) throw new NotFoundError('Application not found.');

    const ownerCompanyId = (application.job as any)?.companyId;
    if (ownerCompanyId !== company.id) {
      throw new UnauthorizedError('You cannot update applications for jobs from another company.');
    }

    if (!this.canTransition(application.status, body.status)) {
      throw new BadRequestError(`Invalid status transition from ${application.status} to ${body.status}.`);
    }

    application.status = body.status;
    if (body.status === 'REJECTED') {
      const reason = (body.rejectionReason ?? '').trim();
      application.rejectionReason = reason || null;
    } else {
      application.rejectionReason = null;
    }

    await application.save();

    return {
      data: mapJobApplication(application, true),
    };
  }

  @Authorized('student')
  @Get('/applications/me')
  async listMyApplications(@CurrentUser() user: any) {
    const student = await this.requireStudent(user);

    const applications = await JobApplication.findAll({
      where: {studentId: student.id},
      include: [
        {
          model: Job,
          attributes: ['id', 'companyId', 'title', 'location', 'workMode', 'isJob', 'isInternship', 'postedAt'],
          include: [{model: Company, attributes: ['id', 'name']}],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return {
      data: applications.map((a) => mapJobApplication(a, false)),
    };
  }

  @Authorized('company')
  @Post('/company')
  async create(@CurrentUser() user: any, @Body() body: CreateJobBody) {
    const company = await this.requireCompany(user);

    const title = body.title.trim();
    const location = body.location.trim();
    const description = body.description.trim();

    return await sequelizeConnection.transaction(async (t) => {
      const job = await Job.create(
        {
          companyId: company.id,
          title,
          location,
          workMode: body.workMode,
          isJob: body.isJob ?? true,
          isInternship: body.isInternship ?? false,
          description,
          postedAt: new Date(),
        },
        {transaction: t},
      );

      // Resolve skills by name
      const uniqueSkills = new Map<string, number>();
      for (const r of body.requirements) {
        const key = r.skillName;
        const val = Math.max(0, Number(r.minYears ?? 0));
        uniqueSkills.set(key, Math.max(uniqueSkills.get(key) ?? 0, val));
      }

      for (const [skillName, minYears] of uniqueSkills.entries()) {
        const tech = await TechSkill.findOne({where: {name: skillName}, transaction: t});
        if (!tech) continue;
        await JobRequirement.create(
          {jobId: job.id, techSkillId: tech.id, minYears},
          {transaction: t},
        );
      }

      const created = await Job.findByPk(job.id, {
        include: [
          {model: Company, attributes: ['id', 'name']},
          {model: JobRequirement, attributes: ['minYears'], include: [{model: TechSkill, attributes: ['name']}]},
        ],
        transaction: t,
      });

      return {
        data: mapJob(created!),
      };
    });
  }

  @Authorized('student')
  @Post('/:jobId/applications')
  async applyToJob(@CurrentUser() user: any, @Param('jobId') jobIdParam: string) {
    const student = await this.requireStudent(user);
    const jobId = Number(jobIdParam);
    if (!Number.isInteger(jobId) || jobId <= 0) {
      throw new BadRequestError('Invalid job id.');
    }

    const job = await Job.findByPk(jobId, {
      include: [{model: Company, attributes: ['id', 'name']}],
      attributes: ['id', 'companyId', 'title', 'location', 'workMode', 'isJob', 'isInternship', 'postedAt'],
    });
    if (!job) throw new NotFoundError('Job not found.');

    const existing = await JobApplication.findOne({where: {jobId: job.id, studentId: student.id}});
    if (existing) {
      throw new BadRequestError('You already applied for this job.');
    }

    try {
      const application = await JobApplication.create({
        jobId: job.id,
        studentId: student.id,
        status: 'APPLIED',
        rejectionReason: null,
      });

      const created = await JobApplication.findByPk(application.id, {
        include: [
          {
            model: Job,
            attributes: ['id', 'companyId', 'title', 'location', 'workMode', 'isJob', 'isInternship', 'postedAt'],
            include: [{model: Company, attributes: ['id', 'name']}],
          },
        ],
      });

      return {
        data: mapJobApplication(created!, false),
      };
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        throw new BadRequestError('You already applied for this job.');
      }
      throw e;
    }
  }

  private canTransition(current: ApplicationStatus, next: ApplicationStatus): boolean {
    return APPLICATION_TRANSITIONS[current].includes(next);
  }

  private async requireCompany(user: any): Promise<Company> {
    const company = await Company.findOne({where: {userId: user.sub}});
    if (!company) throw new UnauthorizedError('Not a company.');
    return company;
  }

  private async requireStudent(user: any): Promise<Student> {
    const student = await Student.findOne({where: {userId: user.sub}});
    if (!student) throw new UnauthorizedError('Not a student.');
    return student;
  }
}
