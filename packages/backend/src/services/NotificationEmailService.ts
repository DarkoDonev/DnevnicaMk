import {ApplicationStatus} from '../sequelize/models/JobApplication';
import {getEmailTransporter} from '../config/email';

export type InvitationDecision = 'ACCEPT' | 'DECLINE';

interface EmailPayload {
  event: string;
  to: string;
  subject: string;
  text: string;
}

interface StudentInvitedParams {
  recipientEmail: string;
  studentName: string;
  companyName: string;
  jobTitle: string;
  jobId: number;
  applicationId: number;
  invitedAt: Date;
}

interface CompanyApplicationReceivedParams {
  recipientEmail: string;
  companyName: string;
  studentName: string;
  jobTitle: string;
  jobId: number;
  applicationId: number;
  appliedAt: Date;
}

interface StudentStatusUpdatedParams {
  recipientEmail: string;
  studentName: string;
  companyName: string;
  jobTitle: string;
  status: ApplicationStatus;
  applicationId: number;
  updatedAt: Date;
  hrInterviewAt?: Date | null;
  hrInterviewLocation?: string | null;
  hrInterviewInfo?: string | null;
}

interface CompanyInvitationResponseParams {
  recipientEmail: string;
  companyName: string;
  studentName: string;
  jobTitle: string;
  applicationId: number;
  decision: InvitationDecision;
  respondedAt: Date;
}

export class NotificationEmailService {
  async sendStudentInvitedEmail(params: StudentInvitedParams): Promise<void> {
    const subject = `New invitation: ${params.jobTitle}`;
    const text = [
      `Hello ${params.studentName || 'student'},`,
      '',
      `${params.companyName} invited you to apply for "${params.jobTitle}".`,
      `Job ID: ${params.jobId}`,
      `Application ID: ${params.applicationId}`,
      `Invited at: ${params.invitedAt.toISOString()}`,
      '',
      'Please log in to review and respond to this invitation.',
    ].join('\n');

    await this.sendMail({
      event: 'job.invited',
      to: params.recipientEmail,
      subject,
      text,
    });
  }

  async sendCompanyApplicationReceivedEmail(params: CompanyApplicationReceivedParams): Promise<void> {
    const subject = `New application: ${params.jobTitle}`;
    const text = [
      `Hello ${params.companyName || 'team'},`,
      '',
      `${params.studentName} applied to "${params.jobTitle}".`,
      `Job ID: ${params.jobId}`,
      `Application ID: ${params.applicationId}`,
      `Applied at: ${params.appliedAt.toISOString()}`,
      '',
      'Please log in to review this application.',
    ].join('\n');

    await this.sendMail({
      event: 'job.applied',
      to: params.recipientEmail,
      subject,
      text,
    });
  }

  async sendStudentApplicationStatusUpdatedEmail(params: StudentStatusUpdatedParams): Promise<void> {
    const subject = `Application status updated: ${params.jobTitle}`;
    const details: string[] = [
      `Hello ${params.studentName || 'student'},`,
      '',
      `${params.companyName} updated your application status for "${params.jobTitle}".`,
      `New status: ${params.status}`,
      `Application ID: ${params.applicationId}`,
      `Updated at: ${params.updatedAt.toISOString()}`,
    ];

    if (params.status === 'HR_INTERVIEW') {
      if (params.hrInterviewAt) {
        details.push(`Interview time: ${params.hrInterviewAt.toISOString()}`);
      }
      if (params.hrInterviewLocation) {
        details.push(`Interview location: ${params.hrInterviewLocation}`);
      }
      if (params.hrInterviewInfo) {
        details.push(`Interview details: ${params.hrInterviewInfo}`);
      }
    }

    details.push('', 'Please log in to view the latest details.');

    await this.sendMail({
      event: 'job.status_updated',
      to: params.recipientEmail,
      subject,
      text: details.join('\n'),
    });
  }

  async sendCompanyInvitationResponseEmail(params: CompanyInvitationResponseParams): Promise<void> {
    const subject = `Invitation ${params.decision.toLowerCase()}: ${params.jobTitle}`;
    const decisionText = params.decision === 'ACCEPT' ? 'accepted' : 'declined';
    const text = [
      `Hello ${params.companyName || 'team'},`,
      '',
      `${params.studentName} ${decisionText} the invitation for "${params.jobTitle}".`,
      `Application ID: ${params.applicationId}`,
      `Responded at: ${params.respondedAt.toISOString()}`,
      '',
      'Please log in to continue the process.',
    ].join('\n');

    await this.sendMail({
      event: 'job.invitation_response',
      to: params.recipientEmail,
      subject,
      text,
    });
  }

  private async sendMail(payload: EmailPayload): Promise<void> {
    const recipient = payload.to.trim();
    if (!recipient) {
      console.warn('[notification-email] Skipping email without recipient', {
        event: payload.event,
      });
      return;
    }

    const transporter = getEmailTransporter();
    if (!transporter) {
      console.warn('[notification-email] SMTP transport is not configured', {
        event: payload.event,
        to: recipient,
      });
      return;
    }

    await transporter.sendMail({
      from: this.getFromAddress(),
      to: recipient,
      subject: payload.subject,
      text: payload.text,
    });
  }

  private getFromAddress(): string {
    const explicitFrom =
      (process.env['NODEMAILER_FROM'] ?? '').trim() ||
      (process.env['EMAIL_FROM'] ?? '').trim() ||
      (process.env['EMAIL_USERNAME'] ?? '').trim();
    if (explicitFrom) return explicitFrom;

    const authUser = (process.env['NODEMAILER_AUTH_USER'] ?? '').trim();
    if (authUser.includes('@')) return authUser;

    return 'no-reply@dnevnicamk.local';
  }
}
