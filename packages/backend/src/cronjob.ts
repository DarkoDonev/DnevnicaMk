import {CronJob} from 'cron';

import sequelizeConnection from './sequelize';
import {EventScraperService} from './services/EventScraperService';

require('dotenv').config();

const DEFAULT_CRON = '0 0 * * *';
const DEFAULT_TIMEZONE = 'Europe/Skopje';

const scraper = new EventScraperService();

async function runSync(trigger: 'startup' | 'schedule'): Promise<void> {
  const startedAt = Date.now();
  console.info(`[events-cron] Sync started (${trigger}) at ${new Date().toISOString()}`);

  try {
    const summary = await scraper.syncFromConfiguredSources();
    const elapsedMs = Date.now() - startedAt;
    console.info(
      `[events-cron] Sync finished (${trigger}) in ${elapsedMs}ms. sources=${summary.sources}, candidates=${summary.processedCandidates}, upserts=${summary.upserts}, errors=${summary.errors.length}`,
    );
  } catch (e: any) {
    console.error(`[events-cron] Sync failed (${trigger}):`, e?.message ?? e);
  }
}

function scheduleSync(): CronJob {
  const timezone = process.env['JOB_FAIR_SYNC_TIMEZONE'] || DEFAULT_TIMEZONE;
  const rawCron = (process.env['JOB_FAIR_SYNC_CRON'] || DEFAULT_CRON).trim() || DEFAULT_CRON;

  try {
    const job = CronJob.from({
      cronTime: rawCron,
      onTick: () => {
        void runSync('schedule');
      },
      timeZone: timezone,
      start: true,
    });
    console.info(`[events-cron] Scheduled with cron="${rawCron}" timezone="${timezone}"`);
    return job;
  } catch (e: any) {
    console.error(
      `[events-cron] Invalid JOB_FAIR_SYNC_CRON="${rawCron}". Falling back to default "${DEFAULT_CRON}".`,
      e?.message ?? e,
    );

    const fallback = CronJob.from({
      cronTime: DEFAULT_CRON,
      onTick: () => {
        void runSync('schedule');
      },
      timeZone: timezone,
      start: true,
    });
    console.info(`[events-cron] Scheduled with fallback cron="${DEFAULT_CRON}" timezone="${timezone}"`);
    return fallback;
  }
}

async function bootstrap(): Promise<void> {
  await sequelizeConnection.authenticate();
  console.info('[events-cron] Database connection established.');

  const job = scheduleSync();

  // Run one sync at startup so the first page load has fresh data.
  await runSync('startup');

  const next = job.nextDate();
  if (next) {
    console.info(`[events-cron] Next run at ${next.toISO?.() ?? String(next)}`);
  }
}

void bootstrap().catch((e: any) => {
  console.error('[events-cron] Failed to bootstrap cron job:', e?.message ?? e);
  process.exit(1);
});
