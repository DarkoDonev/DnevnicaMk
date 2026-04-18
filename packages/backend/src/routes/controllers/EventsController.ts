import {Authorized, Get, JsonController} from 'routing-controllers';
import {Op} from 'sequelize';

import {Event} from '../../sequelize/models/Event';

@JsonController('/api/events')
export class EventsController {
  @Authorized()
  @Get('')
  async listUpcoming() {
    const events = await Event.findAll({
      where: {
        startsAt: {
          [Op.gte]: new Date(),
        },
      },
      order: [['startsAt', 'ASC']],
    });

    return {
      data: events.map((event) => ({
        id: event.id,
        title: event.title,
        startsAtIso: event.startsAt.toISOString(),
        location: event.location ?? undefined,
        snippet: event.snippet ?? undefined,
        sourceName: event.sourceName,
        sourceUrl: event.sourceUrl,
        eventUrl: event.eventUrl,
      })),
    };
  }
}
