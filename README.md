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
