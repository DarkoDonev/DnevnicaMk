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
  IsDateString,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  MaxLength,
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
import {StudentGithubEvaluation} from '../../sequelize/models/StudentGithubEvaluation';
import {StudentSkill} from '../../sequelize/models/StudentSkill';
import {TechSkill} from '../../sequelize/models/TechSkill';
import {User} from '../../sequelize/models/User';
import {enqueueNotificationEmailJob, NotificationEmailJobData} from '../../queues/notification-email-queue';
import {NotificationsService} from '../../services/NotificationsService';

interface NormalizedRequirement {
  skillName: string;
  minYears: number;
}

interface JobStats {
  applicationsCount: number;
  invitedCount: number;
  potentialCount: number;
}

interface JobFlags {
  isJob: boolean;
  isInternship: boolean;
}

const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'INVITED',
  'APPLIED',
  'APPROVED',
  'HR_INTERVIEW',
  'TECHNICAL_INTERVIEW',
  'DONE',
  'DECLINED',
  'REJECTED',
];

const APPLICATION_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  INVITED: [],
  APPLIED: ['APPROVED', 'REJECTED'],
  APPROVED: ['HR_INTERVIEW', 'TECHNICAL_INTERVIEW', 'REJECTED'],
  HR_INTERVIEW: ['DONE', 'REJECTED'],
  TECHNICAL_INTERVIEW: ['DONE', 'REJECTED'],
  DONE: [],
  DECLINED: [],
  REJECTED: [],
};

const COMPANY_TO_STUDENT_ALERT_STATUSES: readonly ApplicationStatus[] = [
  'APPROVED',
  'HR_INTERVIEW',
  'TECHNICAL_INTERVIEW',
  'DONE',
  'REJECTED',
];

const STUDENT_INVITE_DECISIONS = ['ACCEPT', 'DECLINE'] as const;
type StudentInviteDecision = (typeof STUDENT_INVITE_DECISIONS)[number];

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

class PotentialPreviewBody {
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

  @IsOptional()
  @IsDateString()
  hrInterviewAtIso?: string;

  @IsOptional()
  @IsString()
  @MaxLength(260)
  hrInterviewLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  hrInterviewInfo?: string;
}

class InviteStudentBody {
  @IsInt()
  @Min(1)
  studentId!: number;
}

class RespondToInvitationBody {
  @IsIn(STUDENT_INVITE_DECISIONS as unknown as string[])
  decision!: StudentInviteDecision;
}

function normalizeRequirements(requirements: readonly {skillName: string; minYears: number}[]): NormalizedRequirement[] {
  const dedup = new Map<string, number>();

  for (const req of requirements) {
    const skillName = (req.skillName ?? '').trim();
    if (!skillName) continue;

    const minYears = Math.max(0, Number(req.minYears ?? 0));
    const prev = dedup.get(skillName);
    dedup.set(skillName, prev === undefined ? minYears : Math.max(prev, minYears));
  }

  return Array.from(dedup.entries()).map(([skillName, minYears]) => ({skillName, minYears}));
}

function extractJobRequirements(job: Job): NormalizedRequirement[] {
  const reqs = (job.requirements ?? []).map((r) => ({
    skillName: ((r.techSkill as any)?.name ?? '').trim(),
    minYears: Math.max(0, Number(r.minYears ?? 0)),
  }));

  return normalizeRequirements(reqs);
}

function matchesListingType(flags: JobFlags, student: Student): boolean {
  if (!flags.isJob && !flags.isInternship) return true;

  const matchesJob = !!flags.isJob && !!student.seekingJob;
  const matchesInternship = !!flags.isInternship && !!student.seekingInternship;
  return matchesJob || matchesInternship;
}

function studentSatisfiesRequirements(student: Student, requirements: readonly NormalizedRequirement[]): boolean {
  if (requirements.length === 0) return true;

  const yearsBySkill = new Map<string, number>();
  for (const studentSkill of student.studentSkills ?? []) {
    const skillName = ((studentSkill.techSkill as any)?.name ?? '').trim();
    if (!skillName) continue;

    const years = Math.max(0, Number(studentSkill.yearsOfExperience ?? 0));
    const prev = yearsBySkill.get(skillName);
    yearsBySkill.set(skillName, prev === undefined ? years : Math.max(prev, years));
  }

  return requirements.every((req) => (yearsBySkill.get(req.skillName) ?? -1) >= req.minYears);
}

function mapJob(j: Job, stats?: JobStats) {
  const mapped: any = {
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

  if (stats) {
    mapped.stats = stats;
  }

  return mapped;
}

function summarySnippet(summary: string | null | undefined): string | null {
  if (!summary) return null;
  const trimmed = summary.trim();
  if (!trimmed) return null;
  const maxLength = 420;
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 3).trimEnd()}...`;
}

function mapEvaluationPreviewFromStudent(student: any) {
  const evaluation = student?.githubEvaluation as StudentGithubEvaluation | null | undefined;
  if (!evaluation) return undefined;

  const rawStatus = String((evaluation as any).status ?? '');
  const status =
    rawStatus === 'pending' || rawStatus === 'ready' || rawStatus === 'failed'
      ? rawStatus
      : 'none';

  return {
    status,
    overallScore: evaluation.overallScore ?? null,
    summarySnippet: summarySnippet(evaluation.summaryMk ?? null),
    lastAnalyzedAt: evaluation.lastAnalyzedAt ? evaluation.lastAnalyzedAt.toISOString() : null,
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

  if (app.hrInterviewAt && app.hrInterviewLocation) {
    mapped.hrInterview = {
      atIso: app.hrInterviewAt.toISOString(),
      location: app.hrInterviewLocation,
      info: app.hrInterviewInfo || undefined,
    };
  }

  if (includeStudent) {
    mapped.student = {
      id: student?.id ?? app.studentId,
      name: student?.name ?? '',
      email: student?.user?.email ?? '',
      headline: student?.headline ?? '',
      location: student?.location ?? '',
      profileImageUrl: student?.profileImagePath ? `/static/${student.profileImagePath}` : undefined,
      aiEvaluationPreview: mapEvaluationPreviewFromStudent(student),
    };
  }

  return mapped;
}

function mapPotentialStudent(student: Student) {
  return {
    id: student.id,
    name: student.name,
    email: (student.user as any)?.email ?? '',
    headline: student.headline,
    location: student.location,
    profileImageUrl: student.profileImagePath ? `/static/${student.profileImagePath}` : undefined,
    seekingJob: !!student.seekingJob,
    seekingInternship: !!student.seekingInternship,
    aiEvaluationPreview: mapEvaluationPreviewFromStudent(student),
    skills: (student.studentSkills ?? []).map((skill) => ({
      skillName: (skill.techSkill as any)?.name ?? '',
      yearsOfExperience: skill.yearsOfExperience,
    })),
  };
}

@JsonController('/api/jobs')
export class JobsController {
  private readonly notifications = new NotificationsService();

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

  @Authorized('student')
  @Get('/student/:jobId')
  async getStudentJobDetails(@Param('jobId') jobIdParam: string) {
    const jobId = Number(jobIdParam);
    if (!Number.isInteger(jobId) || jobId <= 0) {
      throw new BadRequestError('Invalid job id.');
    }

    const job = await Job.findByPk(jobId, {
      include: [
        {model: Company, attributes: ['id', 'name', 'location', 'websiteUrl']},
        {
          model: JobRequirement,
          attributes: ['minYears'],
          include: [{model: TechSkill, attributes: ['name']}],
        },
      ],
    });

    if (!job) throw new NotFoundError('Job not found.');

    return {
      data: {
        job: mapJob(job),
      },
    };
  }

  @Authorized('company')
  @Get('/company')
  async listForCompany(@CurrentUser() user: any) {
    const company = await this.requireCompany(user);

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

    if (jobs.length === 0) {
      return {data: []};
    }

    const jobIds = jobs.map((j) => j.id);
    const applications = await JobApplication.findAll({
      where: {jobId: jobIds},
      attributes: ['jobId', 'studentId', 'status'],
    });

    const students = await this.fetchStudentsForMatching(false, false);
    const statsByJobId = this.buildStatsByJobId(jobs, applications, students);

    return {
      data: jobs.map((j) => mapJob(j, statsByJobId.get(j.id))),
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
          attributes: ['id', 'name', 'headline', 'location', 'profileImagePath'],
          include: [
            {model: User, attributes: ['email']},
            {model: StudentGithubEvaluation, attributes: ['status', 'overallScore', 'summaryMk', 'lastAnalyzedAt']},
          ],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    return {
      data: applications.map((a) => mapJobApplication(a, true)),
    };
  }

  @Authorized('company')
  @Get('/company/:jobId/potential-students')
  async listPotentialStudents(@CurrentUser() user: any, @Param('jobId') jobIdParam: string) {
    const company = await this.requireCompany(user);
    const jobId = Number(jobIdParam);
    if (!Number.isInteger(jobId) || jobId <= 0) {
      throw new BadRequestError('Invalid job id.');
    }

    const job = await this.requireOwnedJob(company, jobId);
    const potentialStudents = await this.getPotentialStudentsForJob(job, true, true);

    return {
      data: potentialStudents.map((student) => mapPotentialStudent(student)),
    };
  }

  @Authorized('company')
  @Get('/company/:jobId')
  async getCompanyJobDetails(@CurrentUser() user: any, @Param('jobId') jobIdParam: string) {
    const company = await this.requireCompany(user);
    const jobId = Number(jobIdParam);
    if (!Number.isInteger(jobId) || jobId <= 0) {
      throw new BadRequestError('Invalid job id.');
    }

    const job = await this.requireOwnedJob(company, jobId);
    const applications = await JobApplication.findAll({
      where: {jobId},
      include: [
        {
          model: Job,
          attributes: ['id', 'companyId', 'title', 'location', 'workMode', 'isJob', 'isInternship', 'postedAt'],
          include: [{model: Company, attributes: ['id', 'name']}],
        },
        {
          model: Student,
          attributes: ['id', 'name', 'headline', 'location', 'profileImagePath'],
          include: [
            {model: User, attributes: ['email']},
            {model: StudentGithubEvaluation, attributes: ['status', 'overallScore', 'summaryMk', 'lastAnalyzedAt']},
          ],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const potentialStudents = await this.getPotentialStudentsForJob(job, true, true);

    return {
      data: {
        job: mapJob(job, {
          applicationsCount: applications.length,
          invitedCount: applications.filter((app) => app.status === 'INVITED').length,
          potentialCount: potentialStudents.length,
        }),
        applications: applications.map((app) => mapJobApplication(app, true)),
      },
    };
  }

  @Authorized('company')
  @Post('/company/:jobId/invitations')
  async inviteStudentToJob(
    @CurrentUser() user: any,
    @Param('jobId') jobIdParam: string,
    @Body() body: InviteStudentBody,
  ) {
    const company = await this.requireCompany(user);
    const jobId = Number(jobIdParam);
    if (!Number.isInteger(jobId) || jobId <= 0) {
      throw new BadRequestError('Invalid job id.');
    }

    const job = await this.requireOwnedJob(company, jobId);

    const student = await Student.findByPk(body.studentId, {
      attributes: ['id', 'userId', 'name', 'headline', 'location', 'seekingJob', 'seekingInternship'],
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

    const existing = await JobApplication.findOne({where: {jobId, studentId: student.id}});
    if (existing) {
      throw new BadRequestError('This student already has an application for this job.');
    }

    const requirements = extractJobRequirements(job);
    const flags: JobFlags = {isJob: !!job.isJob, isInternship: !!job.isInternship};
    const isPotential = matchesListingType(flags, student) && studentSatisfiesRequirements(student, requirements);
    if (!isPotential) {
      throw new BadRequestError('Student does not match this job requirements.');
    }

    try {
      const application = await JobApplication.create({
        jobId,
        studentId: student.id,
        status: 'INVITED',
        rejectionReason: null,
      });

      const created = await JobApplication.findByPk(application.id, {
        include: [
          {
            model: Job,
            attributes: ['id', 'companyId', 'title', 'location', 'workMode', 'isJob', 'isInternship', 'postedAt'],
            include: [{model: Company, attributes: ['id', 'name']}],
          },
          {
            model: Student,
            attributes: ['id', 'name', 'headline', 'location', 'profileImagePath'],
            include: [
              {model: User, attributes: ['email']},
              {model: StudentGithubEvaluation, attributes: ['status', 'overallScore', 'summaryMk', 'lastAnalyzedAt']},
            ],
          },
        ],
      });

      await this.notifications.createOneBestEffort({
        userId: student.userId,
        type: 'JOB_INVITED',
        title: 'New job invitation',
        message: `${company.name} invited you to "${job.title}".`,
        payload: {jobId},
      });

      await this.enqueueNotificationEmail({
        event: 'job.invited',
        recipientEmail: created?.student?.user?.email ?? '',
        studentName: created?.student?.name ?? student.name,
        companyName: created?.job?.company?.name ?? company.name,
        jobTitle: created?.job?.title ?? job.title,
        jobId: created?.job?.id ?? job.id,
        applicationId: application.id,
        invitedAtIso: application.createdAt.toISOString(),
      });

      return {
        data: mapJobApplication(created!, true),
      };
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        throw new BadRequestError('This student already has an application for this job.');
      }
      throw e;
    }
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
          attributes: ['id', 'userId', 'name', 'headline', 'location', 'profileImagePath'],
          include: [
            {model: User, attributes: ['email']},
            {model: StudentGithubEvaluation, attributes: ['status', 'overallScore', 'summaryMk', 'lastAnalyzedAt']},
          ],
        },
      ],
    });

    if (!application) throw new NotFoundError('Application not found.');

    const ownerCompanyId = (application.job as any)?.companyId;
    if (ownerCompanyId !== company.id) {
      throw new UnauthorizedError('You cannot update applications for jobs from another company.');
    }

    const isHrReschedule = application.status === 'HR_INTERVIEW' && body.status === 'HR_INTERVIEW';
    if (!this.canTransition(application.status, body.status, isHrReschedule)) {
      throw new BadRequestError(`Invalid status transition from ${application.status} to ${body.status}.`);
    }

    if (body.status === 'HR_INTERVIEW') {
      const interviewLocation = (body.hrInterviewLocation ?? '').trim();
      const interviewAtIso = (body.hrInterviewAtIso ?? '').trim();
      const interviewInfo = (body.hrInterviewInfo ?? '').trim();

      if (!interviewLocation) {
        throw new BadRequestError('HR interview location is required.');
      }
      if (!interviewAtIso) {
        throw new BadRequestError('HR interview time is required.');
      }

      const interviewAt = new Date(interviewAtIso);
      if (Number.isNaN(interviewAt.getTime())) {
        throw new BadRequestError('HR interview time is invalid.');
      }
      if (interviewAt.getTime() <= Date.now()) {
        throw new BadRequestError('HR interview time must be in the future.');
      }

      application.hrInterviewLocation = interviewLocation;
      application.hrInterviewAt = interviewAt;
      application.hrInterviewInfo = interviewInfo || null;
    }

    application.status = body.status;
    if (body.status === 'REJECTED') {
      const reason = (body.rejectionReason ?? '').trim();
      application.rejectionReason = reason || null;
    } else {
      application.rejectionReason = null;
    }

    await application.save();

    const studentUserId = Number((application.student as any)?.userId);
    await this.notifications.createOneBestEffort({
      userId: studentUserId,
      type: 'JOB_STATUS_CHANGED',
      title: 'Application status updated',
      message: `Your application for "${(application.job as any)?.title ?? 'this job'}" is now ${this.applicationStatusLabel(body.status)}.`,
      payload: {jobId: Number(application.jobId)},
    });

    if (COMPANY_TO_STUDENT_ALERT_STATUSES.includes(body.status)) {
      await this.enqueueNotificationEmail({
        event: 'job.status_updated',
        recipientEmail: application.student?.user?.email ?? '',
        studentName: application.student?.name ?? '',
        companyName: application.job?.company?.name ?? company.name,
        jobTitle: application.job?.title ?? '',
        status: body.status,
        applicationId: application.id,
        updatedAtIso: application.updatedAt.toISOString(),
        hrInterviewAtIso: application.hrInterviewAt ? application.hrInterviewAt.toISOString() : null,
        hrInterviewLocation: application.hrInterviewLocation ?? null,
        hrInterviewInfo: application.hrInterviewInfo ?? null,
      });
    }

    return {
      data: mapJobApplication(application, true),
    };
  }

  @Authorized('student')
  @Patch('/student/applications/:applicationId/respond')
  async respondToInvitation(
    @CurrentUser() user: any,
    @Param('applicationId') applicationIdParam: string,
    @Body() body: RespondToInvitationBody,
  ) {
    const student = await this.requireStudent(user);
    const applicationId = Number(applicationIdParam);
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      throw new BadRequestError('Invalid application id.');
    }

    const application = await JobApplication.findByPk(applicationId, {
      include: [
        {
          model: Job,
          attributes: ['id', 'companyId', 'title', 'location', 'workMode', 'isJob', 'isInternship', 'postedAt'],
          include: [{model: Company, attributes: ['id', 'name', 'userId'], include: [{model: User, attributes: ['email']}]}],
        },
      ],
    });

    if (!application) throw new NotFoundError('Application not found.');
    if (application.studentId !== student.id) {
      throw new UnauthorizedError('You cannot respond to another student\'s invitation.');
    }
    if (application.status !== 'INVITED') {
      throw new BadRequestError('Only INVITED applications can be accepted or declined.');
    }

    application.status = body.decision === 'ACCEPT' ? 'APPLIED' : 'DECLINED';
    application.rejectionReason = null;
    await application.save();

    const ownerUserId = Number((application.job as any)?.company?.userId);
    const decisionLabel = body.decision === 'ACCEPT' ? 'accepted' : 'declined';
    await this.notifications.createOneBestEffort({
      userId: ownerUserId,
      type: 'JOB_INVITE_RESPONSE',
      title: 'Invitation response received',
      message: `${student.name} ${decisionLabel} your invitation for "${(application.job as any)?.title ?? 'this job'}".`,
      payload: {jobId: Number(application.jobId)},
    });

    await this.enqueueNotificationEmail({
      event: 'job.invitation_response',
      recipientEmail: application.job?.company?.user?.email ?? '',
      companyName: application.job?.company?.name ?? '',
      studentName: student.name,
      jobTitle: application.job?.title ?? '',
      applicationId: application.id,
      decision: body.decision,
      respondedAtIso: application.updatedAt.toISOString(),
    });

    return {
      data: mapJobApplication(application, false),
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
  @Post('/company/potential-preview')
  async previewPotentialStudents(@Body() body: PotentialPreviewBody) {
    const requirements = normalizeRequirements(body.requirements);
    if (requirements.length === 0) {
      return {
        data: {count: 0},
      };
    }

    const flags: JobFlags = {
      isJob: body.isJob ?? true,
      isInternship: body.isInternship ?? false,
    };

    const students = await this.fetchStudentsForMatching(false, false);
    const count = students.filter(
      (student) => matchesListingType(flags, student) && studentSatisfiesRequirements(student, requirements),
    ).length;

    return {
      data: {count},
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

      const uniqueSkills = new Map<string, number>();
      for (const req of body.requirements) {
        const skillName = req.skillName.trim();
        if (!skillName) continue;
        const minYears = Math.max(0, Number(req.minYears ?? 0));
        uniqueSkills.set(skillName, Math.max(uniqueSkills.get(skillName) ?? 0, minYears));
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
      include: [{model: Company, attributes: ['id', 'name', 'userId'], include: [{model: User, attributes: ['email']}]}],
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
            include: [{model: Company, attributes: ['id', 'name'], include: [{model: User, attributes: ['email']}]}],
          },
        ],
      });

      const companyUserId = Number((job.company as any)?.userId);
      await this.notifications.createOneBestEffort({
        userId: companyUserId,
        type: 'JOB_NEW_APPLICATION',
        title: 'New job application',
        message: `${student.name} applied for "${job.title}".`,
        payload: {jobId: job.id},
      });

      await this.enqueueNotificationEmail({
        event: 'job.applied',
        recipientEmail: created?.job?.company?.user?.email ?? job.company?.user?.email ?? '',
        companyName: created?.job?.company?.name ?? job.company?.name ?? '',
        studentName: student.name,
        jobTitle: created?.job?.title ?? job.title,
        jobId: created?.job?.id ?? job.id,
        applicationId: application.id,
        appliedAtIso: application.createdAt.toISOString(),
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

  private canTransition(current: ApplicationStatus, next: ApplicationStatus, allowHrReschedule = false): boolean {
    if (allowHrReschedule && current === 'HR_INTERVIEW' && next === 'HR_INTERVIEW') {
      return true;
    }
    return APPLICATION_TRANSITIONS[current].includes(next);
  }

  private applicationStatusLabel(status: ApplicationStatus): string {
    if (status === 'INVITED') return 'Invited';
    if (status === 'APPLIED') return 'Applied';
    if (status === 'APPROVED') return 'Approved';
    if (status === 'HR_INTERVIEW') return 'HR Interview';
    if (status === 'TECHNICAL_INTERVIEW') return 'Technical Interview';
    if (status === 'DONE') return 'Done';
    if (status === 'DECLINED') return 'Declined';
    if (status === 'REJECTED') return 'Rejected';
    return status;
  }

  private async enqueueNotificationEmail(jobData: NotificationEmailJobData): Promise<void> {
    await enqueueNotificationEmailJob(jobData).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[notification-email] Failed to send job notification email', {
        event: jobData.event,
        error: message,
      });
    });
  }

  private buildStatsByJobId(
    jobs: readonly Job[],
    applications: readonly JobApplication[],
    students: readonly Student[],
  ): Map<number, JobStats> {
    const existingStudentIdsByJobId = new Map<number, Set<number>>();
    const applicationsCountByJobId = new Map<number, number>();
    const invitedCountByJobId = new Map<number, number>();

    for (const app of applications) {
      const jobId = Number(app.jobId);
      const existingIds = existingStudentIdsByJobId.get(jobId) ?? new Set<number>();
      existingIds.add(Number(app.studentId));
      existingStudentIdsByJobId.set(jobId, existingIds);

      applicationsCountByJobId.set(jobId, (applicationsCountByJobId.get(jobId) ?? 0) + 1);
      if (app.status === 'INVITED') {
        invitedCountByJobId.set(jobId, (invitedCountByJobId.get(jobId) ?? 0) + 1);
      }
    }

    const statsByJobId = new Map<number, JobStats>();

    for (const job of jobs) {
      const requirements = extractJobRequirements(job);
      const existingIds = existingStudentIdsByJobId.get(job.id) ?? new Set<number>();
      const flags: JobFlags = {isJob: !!job.isJob, isInternship: !!job.isInternship};

      const potentialCount = students.filter((student) => {
        if (existingIds.has(student.id)) return false;
        if (!matchesListingType(flags, student)) return false;
        return studentSatisfiesRequirements(student, requirements);
      }).length;

      statsByJobId.set(job.id, {
        applicationsCount: applicationsCountByJobId.get(job.id) ?? 0,
        invitedCount: invitedCountByJobId.get(job.id) ?? 0,
        potentialCount,
      });
    }

    return statsByJobId;
  }

  private async getPotentialStudentsForJob(job: Job, includeUser: boolean, includeEvaluation = false): Promise<Student[]> {
    const applications = await JobApplication.findAll({
      where: {jobId: job.id},
      attributes: ['studentId'],
    });
    const excludedStudentIds = new Set<number>(applications.map((app) => Number(app.studentId)));

    const students = await this.fetchStudentsForMatching(includeUser, includeEvaluation);
    const requirements = extractJobRequirements(job);
    const flags: JobFlags = {isJob: !!job.isJob, isInternship: !!job.isInternship};

    return students
      .filter((student) => {
        if (excludedStudentIds.has(student.id)) return false;
        if (!matchesListingType(flags, student)) return false;
        return studentSatisfiesRequirements(student, requirements);
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private async fetchStudentsForMatching(includeUser: boolean, includeEvaluation = false): Promise<Student[]> {
    const includes: any[] = [
      {
        model: StudentSkill,
        attributes: ['yearsOfExperience'],
        include: [{model: TechSkill, attributes: ['name']}],
      },
    ];

    if (includeUser) {
      includes.push({model: User, attributes: ['email']});
    }

    if (includeEvaluation) {
      includes.push({model: StudentGithubEvaluation, attributes: ['status', 'overallScore', 'summaryMk', 'lastAnalyzedAt']});
    }

    return Student.findAll({
      attributes: ['id', 'name', 'headline', 'location', 'seekingJob', 'seekingInternship', 'profileImagePath'],
      include: includes,
      order: [['name', 'ASC']],
    });
  }

  private async requireOwnedJob(company: Company, jobId: number): Promise<Job> {
    const job = await Job.findByPk(jobId, {
      include: [
        {model: Company, attributes: ['id', 'name']},
        {
          model: JobRequirement,
          attributes: ['minYears'],
          include: [{model: TechSkill, attributes: ['name']}],
        },
      ],
    });

    if (!job) throw new NotFoundError('Job not found.');
    if (job.companyId !== company.id) {
      throw new UnauthorizedError('You cannot access jobs from another company.');
    }
    return job;
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
