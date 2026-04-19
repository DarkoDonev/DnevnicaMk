import {Authorized, BadRequestError, CurrentUser, Get, JsonController, NotFoundError, Put, UploadedFile} from 'routing-controllers';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import {Company} from '../../sequelize/models/Company';
import {User} from '../../sequelize/models/User';
import {safeFilename} from '../../utils/safe-filename';

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
        profileImageUrl: company.profileImagePath ? `/static/${company.profileImagePath}` : null,
        registrationStatus: company.registrationStatus,
      },
    };
  }

  @Authorized('company')
  @Put('/me/photo')
  async uploadPhoto(
    @CurrentUser() user: any,
    @UploadedFile('photo', {
      options: multer({
        storage: multer.memoryStorage(),
        limits: {fileSize: 5 * 1024 * 1024}, // 5MB
      }),
    })
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestError('Missing file field "photo".');

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestError('Profile photo must be JPG, PNG, or WEBP.');
    }

    const company = await Company.findOne({where: {userId: Number(user?.sub)}});
    if (!company) throw new NotFoundError('Company not found.');

    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeOrig = safeFilename(file.originalname || 'photo');
    const fileName = `profile_${company.id}_${Date.now()}${ext || ''}`;

    // Stored under backend/static/uploads/profile/company/<companyId>/
    const relDir = path.join('uploads', 'profile', 'company', String(company.id));
    const relPath = path.join(relDir, fileName);
    const absDir = path.resolve(__dirname, '../../../static', relDir);
    const absPath = path.resolve(__dirname, '../../../static', relPath);

    fs.mkdirSync(absDir, {recursive: true});
    fs.writeFileSync(absPath, file.buffer);

    company.profileImagePath = relPath.replace(/\\/g, '/');
    company.profileImageOriginalName = safeOrig;
    await company.save();

    return this.me(user);
  }
}
