# DnevnicaMk

## Approval-Based Company Registration

This project now includes an admin-reviewed company onboarding flow:

- Company accounts register as `pending` and are not auto-logged-in.
- New companies are redirected to `/register/company-pending` and must call/email admins.
- Admin users can approve/reject companies at `/admin/company-approvals`.
- Pending/rejected companies cannot log in.

## Environment

Add these values to `.env` (see `.env-sample`):

- `ADMIN_APPROVAL_EMAIL` (shown on the pending-registration page)
- `ADMIN_APPROVAL_PHONE` (shown on the pending-registration page)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (used by BullMQ email queue)
- `NODEMAILER_AUTH_USER`, `NODEMAILER_AUTH_PASS` and either `NODEMAILER_SERVICE` or `NODEMAILER_HOST` + `NODEMAILER_PORT`
- Optional queue tuning: `EMAIL_QUEUE_*` variables (`EMAIL_QUEUE_RUN_WORKER_IN_API=true` starts worker inside backend API process)

## Email Delivery (BullMQ)

- Job notification emails are now queued in BullMQ.
- API requests enqueue jobs; the worker sends emails asynchronously.
- By default worker starts with backend server (`EMAIL_QUEUE_RUN_WORKER_IN_API=true`).

## Database Setup

From `packages/backend`:

```bash
npm run migrate
npm run seed
```

## Seeded Local Accounts

- Admin: `admin@dnevnicamk.local` / `admin123`
- Company: `hr@nimbuslabs.com` / `company123`
- Student: `elena.petrova@studentmail.com` / `student123`
