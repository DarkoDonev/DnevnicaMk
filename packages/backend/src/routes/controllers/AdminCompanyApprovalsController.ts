import {
  Authorized,
  BadRequestError,
  Body,
  CurrentUser,
  Get,
  JsonController,
  NotFoundError,
  Param,
  Post,
  QueryParams,
} from 'routing-controllers';
import {IsIn, IsOptional, IsString} from 'class-validator';

import {Company, CompanyRegistrationStatus} from '../../sequelize/models/Company';
import {User} from '../../sequelize/models/User';

class CompanyApprovalsQuery {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: CompanyRegistrationStatus;
}

class ReviewBody {
  @IsOptional()
  @IsString()
  note?: string;
}

@JsonController('/api/admin/company-approvals')
@Authorized('admin')
export class AdminCompanyApprovalsController {
  @Get('')
  async list(@QueryParams() query: CompanyApprovalsQuery) {
    const status = query.status ?? 'pending';
    const companies = await Company.findAll({
      where: {registrationStatus: status},
      include: [{model: User, attributes: ['email']}],
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    return {
      data: companies.map((company) => ({
        id: company.id,
        name: company.name,
        location: company.location,
        websiteUrl: company.websiteUrl ?? null,
        registrationStatus: company.registrationStatus,
        companyEmail: (company.user as any)?.email ?? '',
        createdAtIso: company.createdAt.toISOString(),
        reviewedAtIso: company.reviewedAt ? company.reviewedAt.toISOString() : null,
        reviewNote: company.reviewNote ?? null,
      })),
    };
  }

  @Post('/:companyId/approve')
  async approve(@Param('companyId') companyId: string, @CurrentUser() user: any, @Body() body: ReviewBody) {
    return this.review(companyId, user?.sub, 'approved', body.note);
  }

  @Post('/:companyId/reject')
  async reject(@Param('companyId') companyId: string, @CurrentUser() user: any, @Body() body: ReviewBody) {
    return this.review(companyId, user?.sub, 'rejected', body.note);
  }

  private async review(
    companyIdParam: string,
    reviewerUserIdParam: number,
    nextStatus: Extract<CompanyRegistrationStatus, 'approved' | 'rejected'>,
    note?: string,
  ) {
    const companyId = Number(companyIdParam);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      throw new NotFoundError('Company not found.');
    }
    const reviewerUserId = Number(reviewerUserIdParam);
    if (!Number.isFinite(reviewerUserId) || reviewerUserId <= 0) {
      throw new NotFoundError('Reviewer not found.');
    }

    const company = await Company.findByPk(companyId, {include: [{model: User, attributes: ['email']}]});
    if (!company) throw new NotFoundError('Company not found.');
    if (company.registrationStatus !== 'pending') {
      throw new BadRequestError('Company registration has already been reviewed.');
    }

    company.registrationStatus = nextStatus;
    company.reviewedAt = new Date();
    company.reviewedByUserId = reviewerUserId;
    company.reviewNote = note?.trim() ? note.trim() : null;
    await company.save();

    return {
      data: {
        id: company.id,
        name: company.name,
        location: company.location,
        websiteUrl: company.websiteUrl ?? null,
        registrationStatus: company.registrationStatus,
        companyEmail: (company.user as any)?.email ?? '',
        createdAtIso: company.createdAt.toISOString(),
        reviewedAtIso: company.reviewedAt ? company.reviewedAt.toISOString() : null,
        reviewNote: company.reviewNote ?? null,
      },
    };
  }
}
