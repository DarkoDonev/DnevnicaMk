import {Notification, NotificationType} from '../sequelize/models/Notification';

type NotificationTarget =
  | {
      kind: 'job';
      jobId: number;
    }
  | {
      kind: 'event_url';
      eventUrl: string;
    };

interface NotificationPayload {
  jobId?: number;
  eventUrl?: string;
}

export interface NotificationItemDto {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  createdAtIso: string;
  isRead: boolean;
  target?: NotificationTarget;
}

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  payload?: NotificationPayload;
}

function parsePayload(raw: string | null | undefined): NotificationPayload {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as NotificationPayload;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function mapTarget(notification: Notification): NotificationTarget | undefined {
  const payload = parsePayload(notification.payloadJson);

  const jobId = Number(payload.jobId);
  if (Number.isInteger(jobId) && jobId > 0) {
    return {kind: 'job', jobId};
  }

  const eventUrl = String(payload.eventUrl ?? '').trim();
  if (eventUrl) {
    return {kind: 'event_url', eventUrl};
  }

  return undefined;
}

function toDto(notification: Notification): NotificationItemDto {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    createdAtIso: notification.createdAt.toISOString(),
    isRead: !!notification.isRead,
    target: mapTarget(notification),
  };
}

export class NotificationsService {
  async listForUser(userId: number, limit = 20): Promise<NotificationItemDto[]> {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const notifications = await Notification.findAll({
      where: {userId},
      order: [['createdAt', 'DESC']],
      limit: safeLimit,
    });
    return notifications.map((notification) => toDto(notification));
  }

  async unreadCount(userId: number): Promise<number> {
    return Notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async markRead(notificationId: number, userId: number): Promise<NotificationItemDto | null> {
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) return null;

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return toDto(notification);
  }

  async createOneBestEffort(input: CreateNotificationInput): Promise<void> {
    try {
      const userId = Number(input.userId);
      if (!Number.isInteger(userId) || userId <= 0) return;

      await Notification.create({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        payloadJson: input.payload ? JSON.stringify(input.payload) : null,
        isRead: false,
        readAt: null,
      });
    } catch (e: any) {
      console.error('[notifications] createOne failed:', e?.message ?? e);
    }
  }

  async createManyBestEffort(inputs: readonly CreateNotificationInput[]): Promise<void> {
    try {
      if (!inputs.length) return;

      const rows = inputs
        .map((input) => {
          const userId = Number(input.userId);
          if (!Number.isInteger(userId) || userId <= 0) return null;
          return {
            userId,
            type: input.type,
            title: input.title,
            message: input.message,
            payloadJson: input.payload ? JSON.stringify(input.payload) : null,
            isRead: false,
            readAt: null,
          };
        })
        .filter((row) => !!row);

      if (!rows.length) return;
      await Notification.bulkCreate(rows as any[]);
    } catch (e: any) {
      console.error('[notifications] createMany failed:', e?.message ?? e);
    }
  }
}
