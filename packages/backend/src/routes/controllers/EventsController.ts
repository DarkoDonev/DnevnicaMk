import {
  Authorized,
  BadRequestError,
  Body,
  CurrentUser,
  Get,
  JsonController,
  Post,
  UnauthorizedError,
} from 'routing-controllers';
import {Op} from 'sequelize';
import {IsDateString, IsOptional, IsString, IsUrl, MaxLength, MinLength} from 'class-validator';

import {buildDedupeKey} from '../../services/EventScraperService';
import {NotificationsService} from '../../services/NotificationsService';
import {Company} from '../../sequelize/models/Company';
import {Event} from '../../sequelize/models/Event';
import {User} from '../../sequelize/models/User';

class CreateCompanyEventBody {
  @IsString()
  @MinLength(4)
  @MaxLength(260)
  title!: string;

  @IsDateString()
  startsAtIso!: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  snippet?: string;

  @IsUrl({require_protocol: true})
  @MaxLength(1000)
  eventUrl!: string;
}

function mapEvent(event: Event) {
  const company = (event as any).company;
  return {
    id: event.id,
    title: event.title,
    startsAtIso: event.startsAt.toISOString(),
    location: event.location ?? undefined,
    snippet: event.snippet ?? undefined,
    sourceName: event.sourceName,
    sourceUrl: event.sourceUrl,
    eventUrl: event.eventUrl,
    createdByCompany: !!event.createdByCompany,
    company: company
      ? {
          id: company.id,
          name: company.name,
        }
      : undefined,
  };
}

@JsonController('/api/events')
export class EventsController {
  private readonly notifications = new NotificationsService();

  @Authorized()
  @Get('')
  async listUpcoming() {
    const events = await Event.findAll({
      where: {
        startsAt: {
          [Op.gte]: new Date(),
        },
      },
      include: [{model: Company, attributes: ['id', 'name'], required: false}],
      order: [['startsAt', 'ASC']],
    });

    return {
      data: events.map((event) => mapEvent(event)),
    };
  }

  @Authorized('company')
  @Post('/company')
  async createCompanyEvent(@CurrentUser() user: any, @Body() body: CreateCompanyEventBody) {
    const company = await Company.findOne({where: {userId: Number(user?.sub)}});
    if (!company) throw new UnauthorizedError('Not a company.');

    const startsAt = new Date(body.startsAtIso);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestError('Invalid event date/time.');
    }
    if (startsAt.getTime() < Date.now()) {
      throw new BadRequestError('Event date/time must be in the future.');
    }

    const title = body.title.trim();
    const eventUrl = body.eventUrl.trim();
    const location = body.location?.trim() || null;
    const snippet = body.snippet?.trim() || null;

    const dedupeKey = `company:${company.id}:${buildDedupeKey({
      sourceName: company.name,
      title,
      eventUrl,
      startsAt,
    })}`;
    const sourceUrl = (company.websiteUrl ?? '').trim() || eventUrl;

    let event = await Event.findOne({where: {dedupeKey}});
    if (!event) {
      event = await Event.create({
        sourceName: company.name,
        sourceUrl,
        eventUrl,
        title,
        startsAt,
        location,
        snippet,
        dedupeKey,
        lastSeenAt: new Date(),
        companyId: company.id,
        createdByCompany: true,
      });
    } else {
      event.sourceName = company.name;
      event.sourceUrl = sourceUrl;
      event.eventUrl = eventUrl;
      event.title = title;
      event.startsAt = startsAt;
      event.location = location;
      event.snippet = snippet;
      event.lastSeenAt = new Date();
      event.companyId = company.id;
      event.createdByCompany = true;
      await event.save();
    }

    const created = await Event.findByPk(event.id, {
      include: [{model: Company, attributes: ['id', 'name'], required: false}],
    });

    const recipients = await User.findAll({
      where: {
        role: {
          [Op.in]: ['student', 'company'],
        },
        id: {
          [Op.ne]: Number(user?.sub),
        },
      },
      attributes: ['id'],
    });

    await this.notifications.createManyBestEffort(
      recipients.map((recipient) => ({
        userId: recipient.id,
        type: 'EVENT_PUBLISHED' as const,
        title: 'New event published',
        message: `${company.name} published "${title}".`,
        payload: {eventUrl},
      })),
    );

    return {
      data: mapEvent(created ?? event),
    };
  }
}
