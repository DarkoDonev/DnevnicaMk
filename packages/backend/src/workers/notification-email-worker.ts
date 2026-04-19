import {Job, Worker} from 'bullmq';

import {getRedisConnectionOptions} from '../config/redis';
import {
  getNotificationEmailQueueName,
  NotificationEmailJobData,
  NotificationEmailJobName,
} from '../queues/notification-email-queue';
import {NotificationEmailService} from '../services/NotificationEmailService';

const DEFAULT_CONCURRENCY = 4;

let workerInstance: Worker<NotificationEmailJobData, void, NotificationEmailJobName> | null = null;
const notificationEmailService = new NotificationEmailService();

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? '');
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseIsoDate(value: string, field: string): Date {
  const normalized = String(value ?? '').trim();
  const parsed = new Date(normalized);
  if (!normalized || Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ISO date for ${field}`);
  }
  return parsed;
}

async function processNotificationEmailJob(
  job: Job<NotificationEmailJobData, void, NotificationEmailJobName>,
): Promise<void> {
  const data = job.data;

  if (data.event === 'job.invited') {
    await notificationEmailService.sendStudentInvitedEmail({
      recipientEmail: data.recipientEmail,
      studentName: data.studentName,
      companyName: data.companyName,
      jobTitle: data.jobTitle,
      jobId: data.jobId,
      applicationId: data.applicationId,
      invitedAt: parseIsoDate(data.invitedAtIso, 'invitedAtIso'),
    });
    return;
  }

  if (data.event === 'job.applied') {
    await notificationEmailService.sendCompanyApplicationReceivedEmail({
      recipientEmail: data.recipientEmail,
      companyName: data.companyName,
      studentName: data.studentName,
      jobTitle: data.jobTitle,
      jobId: data.jobId,
      applicationId: data.applicationId,
      appliedAt: parseIsoDate(data.appliedAtIso, 'appliedAtIso'),
    });
    return;
  }

  if (data.event === 'job.status_updated') {
    await notificationEmailService.sendStudentApplicationStatusUpdatedEmail({
      recipientEmail: data.recipientEmail,
      studentName: data.studentName,
      companyName: data.companyName,
      jobTitle: data.jobTitle,
      status: data.status,
      applicationId: data.applicationId,
      updatedAt: parseIsoDate(data.updatedAtIso, 'updatedAtIso'),
      hrInterviewAt: data.hrInterviewAtIso ? parseIsoDate(data.hrInterviewAtIso, 'hrInterviewAtIso') : null,
      hrInterviewLocation: data.hrInterviewLocation ?? null,
      hrInterviewInfo: data.hrInterviewInfo ?? null,
    });
    return;
  }

  if (data.event === 'job.invitation_response') {
    await notificationEmailService.sendCompanyInvitationResponseEmail({
      recipientEmail: data.recipientEmail,
      companyName: data.companyName,
      studentName: data.studentName,
      jobTitle: data.jobTitle,
      applicationId: data.applicationId,
      decision: data.decision,
      respondedAt: parseIsoDate(data.respondedAtIso, 'respondedAtIso'),
    });
    return;
  }

  throw new Error(`Unsupported notification email event: ${(data as any)?.event}`);
}

export function startNotificationEmailWorker(): Worker<NotificationEmailJobData, void, NotificationEmailJobName> {
  if (workerInstance) return workerInstance;

  const queueName = getNotificationEmailQueueName();
  const concurrency = parsePositiveInteger(process.env['EMAIL_QUEUE_WORKER_CONCURRENCY'], DEFAULT_CONCURRENCY);

  workerInstance = new Worker<NotificationEmailJobData, void, NotificationEmailJobName>(queueName, processNotificationEmailJob, {
    connection: getRedisConnectionOptions(),
    concurrency,
  });

  workerInstance.on('ready', () => {
    console.info('[notification-email-queue] Worker is ready', {
      queueName,
      concurrency,
    });
  });

  workerInstance.on('error', (error: Error) => {
    console.error('[notification-email-queue] Worker error', {
      queueName,
      error: error.message,
    });
  });

  workerInstance.on('failed', (job, error: Error) => {
    console.error('[notification-email-queue] Job failed', {
      queueName,
      event: job?.name ?? 'unknown',
      jobId: job?.id ?? 'unknown',
      attemptsMade: job?.attemptsMade ?? 0,
      error: error.message,
    });
  });

  return workerInstance;
}

export async function stopNotificationEmailWorker(): Promise<void> {
  if (!workerInstance) return;
  await workerInstance.close();
  workerInstance = null;
}
