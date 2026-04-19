import {
  Authorized,
  BadRequestError,
  CurrentUser,
  Get,
  JsonController,
  NotFoundError,
  Patch,
  Param,
  QueryParam,
  UnauthorizedError,
} from 'routing-controllers';

import {NotificationsService} from '../../services/NotificationsService';

@JsonController('/api/notifications')
export class NotificationsController {
  private readonly notifications = new NotificationsService();

  @Authorized()
  @Get('')
  async list(@CurrentUser() user: any, @QueryParam('limit') limitParam?: string) {
    const userId = Number(user?.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedError('Missing or invalid user.');
    }

    const limitRaw = limitParam === undefined ? 20 : Number(limitParam);
    if (!Number.isInteger(limitRaw) || limitRaw <= 0) {
      throw new BadRequestError('Limit must be a positive integer.');
    }

    return {
      data: await this.notifications.listForUser(userId, limitRaw),
    };
  }

  @Authorized()
  @Get('/unread-count')
  async unreadCount(@CurrentUser() user: any) {
    const userId = Number(user?.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedError('Missing or invalid user.');
    }

    return {
      data: {
        count: await this.notifications.unreadCount(userId),
      },
    };
  }

  @Authorized()
  @Patch('/:notificationId/read')
  async markRead(@CurrentUser() user: any, @Param('notificationId') notificationIdParam: string) {
    const userId = Number(user?.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedError('Missing or invalid user.');
    }

    const notificationId = Number(notificationIdParam);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      throw new BadRequestError('Invalid notification id.');
    }

    const marked = await this.notifications.markRead(notificationId, userId);
    if (!marked) {
      throw new NotFoundError('Notification not found.');
    }

    return {data: marked};
  }
}
