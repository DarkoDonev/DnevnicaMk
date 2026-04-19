'use strict';

const bcrypt = require('bcryptjs');

async function selectOne(sequelize, sql, replacements) {
  const [rows] = await sequelize.query(sql, {replacements});
  return rows?.[0] ?? null;
}

async function selectAll(sequelize, sql, replacements) {
  const [rows] = await sequelize.query(sql, {replacements});
  return rows ?? [];
}

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const companyPasswordHash = bcrypt.hashSync('company123', 10);
    const studentPasswordHash = bcrypt.hashSync('student123', 10);

    // Users (auth identities)
    await queryInterface.bulkInsert(
      'users',
      [
        {email: 'admin@dnevnicamk.local', passwordHash: adminPasswordHash, role: 'admin', createdAt: now, updatedAt: now},
        {email: 'hr@dnevnica.mk', passwordHash: companyPasswordHash, role: 'company', createdAt: now, updatedAt: now},
        {
          email: 'talent@blueoak.dev',
          passwordHash: companyPasswordHash,
          role: 'company',
          createdAt: now,
          updatedAt: now,
        },
        {
          email: 'darko.donev@studentmail.com',
          passwordHash: studentPasswordHash,
          role: 'student',
          createdAt: now,
          updatedAt: now,
        },
        {
          email: 'boris.goshevski@studentmail.com',
          passwordHash: studentPasswordHash,
          role: 'student',
          createdAt: now,
          updatedAt: now,
        },
        {
          email: 'metodija.danevski@studentmail.com',
          passwordHash: studentPasswordHash,
          role: 'student',
          createdAt: now,
          updatedAt: now,
        },
      ],
      {ignoreDuplicates: true},
    );

    const sequelize = queryInterface.sequelize;

    const adminUser = await selectOne(sequelize, 'SELECT id FROM users WHERE email = :email', {email: 'admin@dnevnicamk.local'});
    const nimbusUser = await selectOne(sequelize, 'SELECT id FROM users WHERE email = :email', {email: 'hr@dnevnica.mk'});
    const blueoakUser = await selectOne(sequelize, 'SELECT id FROM users WHERE email = :email', {email: 'talent@blueoak.dev'});
    const elenaUser = await selectOne(sequelize, 'SELECT id FROM users WHERE email = :email', {email: 'darko.donev@studentmail.com'});
    const markoUser = await selectOne(sequelize, 'SELECT id FROM users WHERE email = :email', {email: 'boris.goshevski@studentmail.com'});
    const saraUser = await selectOne(sequelize, 'SELECT id FROM users WHERE email = :email', {email: 'metodija.danevski@studentmail.com'});

    // Companies
    await queryInterface.bulkInsert(
      'companies',
      [
        {
          userId: nimbusUser.id,
          name: 'Dnevnica Mk',
          location: 'Skopje, MK',
          websiteUrl: 'https://dnevnica.mk',
          registrationStatus: 'approved',
          reviewedAt: now,
          reviewNote: 'Seeded demo company',
          reviewedByUserId: adminUser.id,
          createdAt: now,
          updatedAt: now,
        },
        {
          userId: blueoakUser.id,
          name: 'AXM',
          location: 'Remote',
          websiteUrl: 'https://blueoak.dev',
          registrationStatus: 'approved',
          reviewedAt: now,
          reviewNote: 'Seeded demo company',
          reviewedByUserId: adminUser.id,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {ignoreDuplicates: true},
    );

    // Students
    await queryInterface.bulkInsert(
      'students',
      [
        {
          userId: elenaUser.id,
          name: 'Darko Donev',
          headline: 'Frontend-focused CS student (Angular, TypeScript)',
          phone: '+389 70 111 222',
          location: 'Skopje, MK',
          linkedInUrl: 'https://www.linkedin.com/in/elena-petrova',
          githubUrl: 'https://github.com/DarkoDonev',
          bio: 'I build clean, accessible UIs and enjoy turning product requirements into intuitive flows.',
          seekingJob: false,
          seekingInternship: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          userId: markoUser.id,
          name: 'Boris Goshevski',
          headline: 'Full-stack student dev (Node.js, React, AWS)',
          phone: '+389 71 333 444',
          location: 'Bitola, MK',
          linkedInUrl: 'https://www.linkedin.com/in/marko-iliev',
          githubUrl: 'https://github.com/rmxOfficial',
          bio: 'I like shipping end-to-end features: APIs, UI, and deployment.',
          seekingJob: true,
          seekingInternship: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          userId: saraUser.id,
          name: 'Metodija Danevski',
          headline: 'Backend + data-minded (Python, SQL, Docker)',
          phone: '+389 72 555 666',
          location: 'Ohrid, MK',
          linkedInUrl: 'https://www.linkedin.com/in/sara-nikolovska',
          githubUrl: 'https://github.com/DanevskiM',
          bio: 'I enjoy building reliable services and making data useful through thoughtful APIs.',
          seekingJob: true,
          seekingInternship: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {ignoreDuplicates: true},
    );

    const nimbusCompany = await selectOne(sequelize, 'SELECT id FROM companies WHERE userId = :userId', {userId: nimbusUser.id});
    const blueoakCompany = await selectOne(sequelize, 'SELECT id FROM companies WHERE userId = :userId', {userId: blueoakUser.id});
    const elenaStudent = await selectOne(sequelize, 'SELECT id FROM students WHERE userId = :userId', {userId: elenaUser.id});
    const markoStudent = await selectOne(sequelize, 'SELECT id FROM students WHERE userId = :userId', {userId: markoUser.id});
    const saraStudent = await selectOne(sequelize, 'SELECT id FROM students WHERE userId = :userId', {userId: saraUser.id});

    const skills = await selectAll(sequelize, 'SELECT id, name FROM tech_skills', {});
    const skillIdByName = new Map(skills.map((s) => [s.name, s.id]));

    const ss = (studentId, name, years) => ({
      studentId,
      techSkillId: skillIdByName.get(name),
      yearsOfExperience: years,
      createdAt: now,
      updatedAt: now,
    });

    await queryInterface.bulkInsert(
      'student_skills',
      [
        ss(elenaStudent.id, 'Angular', 2),
        ss(elenaStudent.id, 'TypeScript', 2),
        ss(elenaStudent.id, 'JavaScript', 3),
        ss(elenaStudent.id, 'SQL', 1),
        ss(elenaStudent.id, 'Docker', 1),

        ss(markoStudent.id, 'Node.js', 2),
        ss(markoStudent.id, 'React', 2),
        ss(markoStudent.id, 'TypeScript', 2),
        ss(markoStudent.id, 'AWS', 1),
        ss(markoStudent.id, 'SQL', 2),

        ss(saraStudent.id, 'Python', 3),
        ss(saraStudent.id, 'SQL', 3),
        ss(saraStudent.id, 'Docker', 2),
        ss(saraStudent.id, 'AWS', 1),
        ss(saraStudent.id, 'Node.js', 1),
      ].filter((r) => r.techSkillId),
      {ignoreDuplicates: true},
    );

    // Jobs + requirements
    const daysAgo = (n) => new Date(Date.now() - 1000 * 60 * 60 * 24 * n);

    await queryInterface.bulkInsert(
      'jobs',
      [
        {
          companyId: nimbusCompany.id,
          title: 'Junior Frontend Intern (Angular)',
          location: 'Skopje, MK',
          workMode: 'Hybrid',
          isJob: false,
          isInternship: true,
          description:
            'Help build internal dashboards. You will work with Angular, TypeScript, and a component-driven design approach. Strong attention to UI details is a plus.',
          postedAt: daysAgo(4),
          createdAt: now,
          updatedAt: now,
        },
        {
          companyId: blueoakCompany.id,
          title: 'Student Full-stack Developer (Node.js + React)',
          location: 'Remote',
          workMode: 'Remote',
          isJob: true,
          isInternship: false,
          description:
            'Build features end-to-end: REST endpoints, UI screens, and deployment basics. Mentorship included. We value curiosity and shipping.',
          postedAt: daysAgo(10),
          createdAt: now,
          updatedAt: now,
        },
        {
          companyId: nimbusCompany.id,
          title: 'Data/Backend Intern (Python)',
          location: 'Skopje, MK',
          workMode: 'On-site',
          isJob: false,
          isInternship: true,
          description:
            'Assist with data pipelines and backend services. You will use Python, SQL, and Docker. Exposure to cloud (AWS) is a plus.',
          postedAt: daysAgo(2),
          createdAt: now,
          updatedAt: now,
        },
      ],
      {ignoreDuplicates: true},
    );

    const jobs = await selectAll(sequelize, 'SELECT id, title FROM jobs', {});
    const jobIdByTitle = new Map(jobs.map((j) => [j.title, j.id]));

    const jr = (title, skillName, minYears) => ({
      jobId: jobIdByTitle.get(title),
      techSkillId: skillIdByName.get(skillName),
      minYears,
      createdAt: now,
      updatedAt: now,
    });

    await queryInterface.bulkInsert(
      'job_requirements',
      [
        jr('Junior Frontend Intern (Angular)', 'Angular', 1),
        jr('Junior Frontend Intern (Angular)', 'TypeScript', 1),
        jr('Junior Frontend Intern (Angular)', 'JavaScript', 1),

        jr('Student Full-stack Developer (Node.js + React)', 'Node.js', 1),
        jr('Student Full-stack Developer (Node.js + React)', 'React', 1),
        jr('Student Full-stack Developer (Node.js + React)', 'SQL', 1),

        jr('Data/Backend Intern (Python)', 'Python', 1),
        jr('Data/Backend Intern (Python)', 'SQL', 1),
        jr('Data/Backend Intern (Python)', 'Docker', 0),
      ].filter((r) => r.jobId && r.techSkillId),
      {ignoreDuplicates: true},
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('job_requirements', null, {});
    await queryInterface.bulkDelete('jobs', null, {});
    await queryInterface.bulkDelete('student_skills', null, {});
    await queryInterface.bulkDelete('students', null, {});
    await queryInterface.bulkDelete('companies', null, {});
    await queryInterface.bulkDelete('users', null, {});
  },
};
