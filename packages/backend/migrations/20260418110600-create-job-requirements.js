'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('job_requirements', {
      id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false},
      jobId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: 'jobs', key: 'id'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      techSkillId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: 'tech_skills', key: 'id'},
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      minYears: {type: Sequelize.INTEGER, allowNull: false, defaultValue: 0},
      createdAt: {type: Sequelize.DATE, allowNull: false},
      updatedAt: {type: Sequelize.DATE, allowNull: false},
    });

    await queryInterface.addIndex('job_requirements', ['jobId', 'techSkillId'], {
      unique: true,
      name: 'uniq_job_skill',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('job_requirements');
  },
};

