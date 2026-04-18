'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const skills = [
      'Angular',
      'React',
      'Vue.js',
      'Node.js',
      'TypeScript',
      'JavaScript',
      'Python',
      'Java',
      'C#',
      'SQL',
      'AWS',
      'Docker',
    ];

    await queryInterface.bulkInsert(
      'tech_skills',
      skills.map((name) => ({name, createdAt: now, updatedAt: now})),
      {ignoreDuplicates: true},
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tech_skills', null, {});
  },
};

