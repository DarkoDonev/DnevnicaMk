import {Authorized, CurrentUser, Get, JsonController, NotFoundError} from 'routing-controllers';

import {Company} from '../../sequelize/models/Company';
import {User} from '../../sequelize/models/User';

@JsonController('/api/companies')
export class CompaniesController {
  @Authorized('company')
  @Get('/me')
  async me(@CurrentUser() user: any) {
    const company = await Company.findOne({
      where: {userId: Number(user?.sub)},
      include: [{model: User, attributes: ['email']}],
    });

    if (!company) throw new NotFoundError('Company not found.');

    return {
      data: {
        id: company.id,
        name: company.name,
        email: (company.user as any)?.email ?? '',
        location: company.location,
        websiteUrl: company.websiteUrl ?? null,
        registrationStatus: company.registrationStatus,
      },
    };
  }
}
