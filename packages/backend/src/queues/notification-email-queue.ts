import {Queue, type JobsOptions} from 'bullmq';

import {ApplicationStatus} from '../sequelize/models/JobApplication';
import {getRedisConnectionOptions} from '../config/redis';
import {InvitationDecision} from '../services/NotificationEmailService';

export type NotificationEmailJobName =
  | 'job.invited'
  | 'job.applied'
  | 'job.status_updated'
  | 'job.invitation_response';

export interface StudentInvitedEmailJobData {
  event: 'job.invited';
  recipientEmail: string;
  studentName: string;
  companyName: string;
  jobTitle: string;
  jobId: number;
  applicationId: number;
  invitedAtIso: string;
}

export interface CompanyApplicationReceivedEmailJobData {
  event: 'job.applied';
  recipientEmail: string;
  companyName: string;
  studentName: string;
  jobTitle: string;
  jobId: number;
  applicationId: number;
  appliedAtIso: string;
}

export interface StudentStatusUpdatedEmailJobData {
  event: 'job.status_updated';
  recipientEmail: string;
  studentName: string;
  companyName: string;
  jobTitle: string;
  status: ApplicationStatus;
  applicationId: number;
  updatedAtIso: string;
  hrInterviewAtIso?: string | null;
  hrInterviewLocation?: string | null;
  hrInterviewInfo?: string | null;
}

export interface CompanyInvitationResponseEmailJobData {
  event: 'job.invitation_response';
  recipientEmail: string;
  companyName: string;
  studentName: string;
  jobTitle: string;
  applicationId: number;
  decision: InvitationDecision;
  respondedAtIso: string;
}

export type NotificationEmailJobData =
  | StudentInvitedEmailJobData
  | CompanyApplicationReceivedEmailJobData
  | StudentStatusUpdatedEmailJobData
  | CompanyInvitationResponseEmailJobData;

const DEFAULT_QUEUE_NAME = 'notification-email-queue';
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 5_000;
const DEFAULT_REMOVE_ON_COMPLETE = 500;

let queueInstance: Queue<NotificationEmailJobData, void, NotificationEmailJobName> | null = null;

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? '');
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export function getNotificationEmailQueueName(): string {
  return (process.env['EMAIL_QUEUE_NAME'] ?? '').trim() || DEFAULT_QUEUE_NAME;
}

function getDefaultJobOptions(): JobsOptions {
  const attempts = parsePositiveInteger(process.env['EMAIL_QUEUE_ATTEMPTS'], DEFAULT_ATTEMPTS);
  const backoffDelay = parsePositiveInteger(process.env['EMAIL_QUEUE_BACKOFF_MS'], DEFAULT_BACKOFF_MS);
  const removeOnComplete = parsePositiveInteger(
    process.env['EMAIL_QUEUE_REMOVE_ON_COMPLETE_COUNT'],
    DEFAULT_REMOVE_ON_COMPLETE,
  );
  const removeOnFail = parseBoolean(process.env['EMAIL_QUEUE_REMOVE_ON_FAIL'], false);

  return {
    attempts,
    backoff: {
      type: 'exponential',
      delay: backoffDelay,
    },
    removeOnComplete,
    removeOnFail,
  };
}

export function getNotificationEmailQueue(): Queue<NotificationEmailJobData, void, NotificationEmailJobName> {
  if (queueInstance) return queueInstance;

  queueInstance = new Queue<NotificationEmailJobData, void, NotificationEmailJobName>(getNotificationEmailQueueName(), {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: getDefaultJobOptions(),
  });

  return queueInstance;
}

export async function enqueueNotificationEmailJob(jobData: NotificationEmailJobData): Promise<void> {
  const queue = getNotificationEmailQueue();
  await queue.add(jobData.event, jobData);
}

export async function closeNotificationEmailQueue(): Promise<void> {
  if (!queueInstance) return;
  await queueInstance.close();
  queueInstance = null;
}
