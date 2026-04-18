import {Authorized, Body, CurrentUser, Get, JsonController, Post, UnauthorizedError} from 'routing-controllers';
import {ArrayMinSize, IsArray, IsIn, IsInt, IsString, Max, Min, MinLength, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';

import sequelizeConnection from '../../sequelize';
import {Company} from '../../sequelize/models/Company';
import {Job} from '../../sequelize/models/Job';
import {JobRequirement} from '../../sequelize/models/JobRequirement';
import {TechSkill} from '../../sequelize/models/TechSkill';

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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({each: true})
  @Type(() => RequirementBody)
  requirements!: RequirementBody[];
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
      data: jobs.map((j) => ({
        id: j.id,
        companyId: j.companyId,
        companyName: (j.company as any)?.name ?? '',
        title: j.title,
        location: j.location,
        workMode: j.workMode,
        description: j.description,
        postedAtIso: j.postedAt.toISOString(),
        requirements: (j.requirements ?? []).map((r) => ({
          skillName: (r.techSkill as any)?.name ?? '',
          minYears: r.minYears,
        })),
      })),
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
      data: jobs.map((j) => ({
        id: j.id,
        companyId: j.companyId,
        companyName: (j.company as any)?.name ?? '',
        title: j.title,
        location: j.location,
        workMode: j.workMode,
        description: j.description,
        postedAtIso: j.postedAt.toISOString(),
        requirements: (j.requirements ?? []).map((r) => ({
          skillName: (r.techSkill as any)?.name ?? '',
          minYears: r.minYears,
        })),
      })),
    };
  }

  @Authorized('company')
  @Post('/company')
  async create(@CurrentUser() user: any, @Body() body: CreateJobBody) {
    const company = await Company.findOne({where: {userId: user.sub}});
    if (!company) throw new UnauthorizedError('Not a company.');

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
        data: {
          id: created!.id,
          companyId: created!.companyId,
          companyName: (created!.company as any)?.name ?? '',
          title: created!.title,
          location: created!.location,
          workMode: created!.workMode,
          description: created!.description,
          postedAtIso: created!.postedAt.toISOString(),
          requirements: (created!.requirements ?? []).map((r) => ({
            skillName: (r.techSkill as any)?.name ?? '',
            minYears: r.minYears,
          })),
        },
      };
    });
  }
}
