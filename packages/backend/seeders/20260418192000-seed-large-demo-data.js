'use strict';

const bcrypt = require('bcryptjs');

const COMPANY_COUNT = 20;
const STUDENT_COUNT = 500;
const JOBS_PER_COMPANY = 3;
const JOB_TITLE_PREFIX = '[SEED-DEMO]';

const COMPANY_LOCATIONS = [
  'Skopje, MK',
  'Bitola, MK',
  'Tetovo, MK',
  'Stip, MK',
  'Ohrid, MK',
  'Kumanovo, MK',
  'Remote',
];

const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];

const FIRST_NAMES = [
  'Ana',
  'Bojan',
  'Damjan',
  'Elena',
  'Filip',
  'Gorjan',
  'Ivana',
  'Jovan',
  'Katerina',
  'Lazar',
  'Marija',
  'Nikola',
  'Petar',
  'Sara',
  'Teodor',
  'Viktor',
  'Zoran',
  'Mila',
  'Stefan',
  'Tamara',
];

const LAST_NAMES = [
  'Andreev',
  'Bogoevski',
  'Cvetkov',
  'Dimitrova',
  'Georgievski',
  'Iliev',
  'Jovanovska',
  'Kostov',
  'Lazarevski',
  'Mitreski',
  'Nikolov',
  'Petrovska',
  'Risteski',
  'Stojanov',
  'Trajkovska',
  'Velkov',
  'Zafirova',
  'Kolevski',
  'Manevska',
  'Spasov',
];

async function selectAll(sequelize, sql, replacements) {
  const [rows] = await sequelize.query(sql, {replacements});
  return rows ?? [];
}

function mulberry32(seed) {
  let t = seed;
  return function random() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickUnique(items, count, random) {
  const pool = items.slice();
  const out = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const idx = Math.floor(random() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

function daysAgo(n) {
  return new Date(Date.now() - 1000 * 60 * 60 * 24 * n);
}

function seededCompanyEmail(index) {
  return `seed.company${String(index + 1).padStart(3, '0')}@dnevnicamk.local`;
}

function seededStudentEmail(index) {
  return `seed.student${String(index + 1).padStart(3, '0')}@studentmail.com`;
}

function buildJobDescription(companyName, roleLabel, skills) {
  const stack = skills.slice(0, 3).join(', ');
  return `Join ${companyName} as a ${roleLabel}. You will collaborate with mentors, build production-ready features, and improve your portfolio through real project delivery. Preferred stack for this role includes ${stack}.`;
}

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const now = new Date();

    const companyPasswordHash = bcrypt.hashSync('comapny123', 10);
    const studentPasswordHash = bcrypt.hashSync('student123', 10);

    const companyUsers = Array.from({length: COMPANY_COUNT}, (_, idx) => ({
      email: seededCompanyEmail(idx),
      passwordHash: companyPasswordHash,
      role: 'company',
      createdAt: now,
      updatedAt: now,
    }));

    const studentUsers = Array.from({length: STUDENT_COUNT}, (_, idx) => ({
      email: seededStudentEmail(idx),
      passwordHash: studentPasswordHash,
      role: 'student',
      createdAt: now,
      updatedAt: now,
    }));

    await queryInterface.bulkInsert('users', [...companyUsers, ...studentUsers], {ignoreDuplicates: true});

    const allSeedUsers = await selectAll(
      sequelize,
      `SELECT id, email FROM users
       WHERE email LIKE 'seed.company%@dnevnicamk.local'
          OR email LIKE 'seed.student%@studentmail.com'`,
      {},
    );
    const userIdByEmail = new Map(allSeedUsers.map((u) => [u.email, u.id]));

    const adminRows = await selectAll(sequelize, 'SELECT id FROM users WHERE email = :email LIMIT 1', {
      email: 'admin@dnevnicamk.local',
    });
    const adminId = adminRows[0]?.id ?? null;

    const companies = Array.from({length: COMPANY_COUNT}, (_, idx) => {
      const userId = userIdByEmail.get(seededCompanyEmail(idx));
      return {
        userId,
        name: `Seed Company ${String(idx + 1).padStart(2, '0')}`,
        location: COMPANY_LOCATIONS[idx % COMPANY_LOCATIONS.length],
        websiteUrl: `https://seed-company-${String(idx + 1).padStart(2, '0')}.example.com`,
        registrationStatus: 'approved',
        reviewedAt: now,
        reviewNote: 'Large demo seed company',
        reviewedByUserId: adminId,
        createdAt: now,
        updatedAt: now,
      };
    }).filter((row) => Number.isInteger(row.userId));

    await queryInterface.bulkInsert('companies', companies, {ignoreDuplicates: true});

    const students = Array.from({length: STUDENT_COUNT}, (_, idx) => {
      const userId = userIdByEmail.get(seededStudentEmail(idx));
      const first = FIRST_NAMES[idx % FIRST_NAMES.length];
      const last = LAST_NAMES[Math.floor(idx / FIRST_NAMES.length) % LAST_NAMES.length];
      const variant = idx % 4;

      let seekingJob = false;
      let seekingInternship = false;
      if (variant === 0) {
        seekingJob = true;
      } else if (variant === 1) {
        seekingInternship = true;
      } else if (variant === 2) {
        seekingJob = true;
        seekingInternship = true;
      }

      return {
        userId,
        name: `${first} ${last} ${String(idx + 1).padStart(3, '0')}`,
        headline: `Student developer focused on practical product delivery #${idx + 1}`,
        phone: `+389 70 ${String(100000 + idx).slice(-6)}`,
        location: COMPANY_LOCATIONS[(idx + 2) % COMPANY_LOCATIONS.length],
        linkedInUrl: `https://www.linkedin.com/in/seed-student-${String(idx + 1).padStart(3, '0')}`,
        githubUrl: `https://github.com/seed-student-${String(idx + 1).padStart(3, '0')}`,
        bio: 'Motivated student building portfolio projects in modern web and backend technologies.',
        seekingJob,
        seekingInternship,
        createdAt: now,
        updatedAt: now,
      };
    }).filter((row) => Number.isInteger(row.userId));

    await queryInterface.bulkInsert('students', students, {ignoreDuplicates: true});

    const companyRows = await selectAll(
      sequelize,
      `SELECT c.id, c.name, c.userId
       FROM companies c
       INNER JOIN users u ON u.id = c.userId
       WHERE u.email LIKE 'seed.company%@dnevnicamk.local'`,
      {},
    );

    const studentRows = await selectAll(
      sequelize,
      `SELECT s.id, s.userId
       FROM students s
       INNER JOIN users u ON u.id = s.userId
       WHERE u.email LIKE 'seed.student%@studentmail.com'`,
      {},
    );

    const skillRows = await selectAll(sequelize, 'SELECT id, name FROM tech_skills ORDER BY id ASC', {});
    if (skillRows.length === 0) {
      throw new Error('No tech skills found. Run tech skills seeder before large demo seed.');
    }

    const studentSkills = [];
    for (const student of studentRows) {
      const random = mulberry32(student.id * 97 + 11);
      const pickCount = 3 + Math.floor(random() * 4); // 3..6
      const picked = pickUnique(skillRows, pickCount, random);

      for (const skill of picked) {
        const years = Math.max(0, Math.min(5, Math.floor(random() * 6)));
        studentSkills.push({
          studentId: student.id,
          techSkillId: skill.id,
          yearsOfExperience: years,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (studentSkills.length > 0) {
      await queryInterface.bulkInsert('student_skills', studentSkills, {ignoreDuplicates: true});
    }

    const roleLabels = ['Junior Software Engineer', 'Internship Program', 'Product Engineering Trainee'];

    const existingSeedJobs = await selectAll(
      sequelize,
      `SELECT id, companyId, title
       FROM jobs
       WHERE title LIKE :prefix`,
      {prefix: `${JOB_TITLE_PREFIX}%`},
    );
    const existingJobKey = new Set(existingSeedJobs.map((job) => `${job.companyId}|${job.title}`));

    const jobsToInsert = [];
    for (const company of companyRows) {
      const companySeedNumber = Number(String(company.name).slice(-2)) || company.id;
      const random = mulberry32(companySeedNumber * 131 + 7);

      for (let slot = 0; slot < JOBS_PER_COMPANY; slot += 1) {
        const roleLabel = roleLabels[slot % roleLabels.length];
        const title = `${JOB_TITLE_PREFIX} ${company.name} • Position ${slot + 1}`;
        const key = `${company.id}|${title}`;
        if (existingJobKey.has(key)) continue;

        const pickedSkills = pickUnique(skillRows, 3, random).map((s) => s.name);
        jobsToInsert.push({
          companyId: company.id,
          title,
          location: COMPANY_LOCATIONS[(company.id + slot) % COMPANY_LOCATIONS.length],
          workMode: WORK_MODES[(company.id + slot) % WORK_MODES.length],
          isJob: slot !== 1,
          isInternship: slot !== 0,
          description: buildJobDescription(company.name, roleLabel, pickedSkills),
          postedAt: daysAgo((company.id + 1) * (slot + 1) % 28),
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (jobsToInsert.length > 0) {
      await queryInterface.bulkInsert('jobs', jobsToInsert, {});
    }

    const seededJobs = await selectAll(
      sequelize,
      `SELECT id, companyId, title
       FROM jobs
       WHERE title LIKE :prefix`,
      {prefix: `${JOB_TITLE_PREFIX}%`},
    );

    const jobRequirements = [];
    for (const job of seededJobs) {
      const random = mulberry32(job.id * 17 + 3);
      const picked = pickUnique(skillRows, 3, random);

      for (const skill of picked) {
        jobRequirements.push({
          jobId: job.id,
          techSkillId: skill.id,
          minYears: Math.max(0, Math.min(3, Math.floor(random() * 4))),
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (jobRequirements.length > 0) {
      await queryInterface.bulkInsert('job_requirements', jobRequirements, {ignoreDuplicates: true});
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;

    const seededCompanyUsers = await selectAll(
      sequelize,
      `SELECT id, email FROM users WHERE email LIKE 'seed.company%@dnevnicamk.local'`,
      {},
    );
    const seededStudentUsers = await selectAll(
      sequelize,
      `SELECT id, email FROM users WHERE email LIKE 'seed.student%@studentmail.com'`,
      {},
    );

    const seededCompanyUserIds = seededCompanyUsers.map((u) => u.id);
    const seededStudentUserIds = seededStudentUsers.map((u) => u.id);

    if (seededCompanyUserIds.length > 0) {
      const companyRows = await selectAll(
        sequelize,
        'SELECT id FROM companies WHERE userId IN (:ids)',
        {ids: seededCompanyUserIds},
      );
      const companyIds = companyRows.map((c) => c.id);

      if (companyIds.length > 0) {
        const seedJobs = await selectAll(
          sequelize,
          'SELECT id FROM jobs WHERE companyId IN (:ids) AND title LIKE :prefix',
          {ids: companyIds, prefix: `${JOB_TITLE_PREFIX}%`},
        );
        const jobIds = seedJobs.map((j) => j.id);

        if (jobIds.length > 0) {
          await queryInterface.bulkDelete('job_requirements', {jobId: jobIds}, {});
          await queryInterface.bulkDelete('jobs', {id: jobIds}, {});
        }
      }

      await queryInterface.bulkDelete('companies', {userId: seededCompanyUserIds}, {});
    }

    if (seededStudentUserIds.length > 0) {
      const studentRows = await selectAll(
        sequelize,
        'SELECT id FROM students WHERE userId IN (:ids)',
        {ids: seededStudentUserIds},
      );
      const studentIds = studentRows.map((s) => s.id);

      if (studentIds.length > 0) {
        await queryInterface.bulkDelete('student_skills', {studentId: studentIds}, {});
        await queryInterface.bulkDelete('students', {id: studentIds}, {});
      }
    }

    const allSeedEmails = [
      ...seededCompanyUsers.map((u) => u.email),
      ...seededStudentUsers.map((u) => u.email),
    ];
    if (allSeedEmails.length > 0) {
      await queryInterface.bulkDelete('users', {email: allSeedEmails}, {});
    }
  },
};
