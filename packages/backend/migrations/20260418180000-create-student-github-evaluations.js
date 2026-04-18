'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_github_evaluations', {
      id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false},
      studentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {model: 'students', key: 'id'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('pending', 'ready', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      overallScore: {type: Sequelize.INTEGER, allowNull: true},
      codeQualityScore: {type: Sequelize.INTEGER, allowNull: true},
      consistencyScore: {type: Sequelize.INTEGER, allowNull: true},
      activityScore: {type: Sequelize.INTEGER, allowNull: true},
      documentationScore: {type: Sequelize.INTEGER, allowNull: true},
      summaryMk: {type: Sequelize.TEXT('long'), allowNull: true},
      strengthsJson: {type: Sequelize.TEXT('long'), allowNull: true},
      improvementsJson: {type: Sequelize.TEXT('long'), allowNull: true},
      reposAnalyzedJson: {type: Sequelize.TEXT('long'), allowNull: true},
      metricsJson: {type: Sequelize.TEXT('long'), allowNull: true},
      lastAnalyzedAt: {type: Sequelize.DATE, allowNull: true},
      cacheExpiresAt: {type: Sequelize.DATE, allowNull: true},
      lastError: {type: Sequelize.TEXT('long'), allowNull: true},
      createdAt: {type: Sequelize.DATE, allowNull: false},
      updatedAt: {type: Sequelize.DATE, allowNull: false},
    });

    await queryInterface.addIndex('student_github_evaluations', ['status'], {
      name: 'idx_student_github_evaluations_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('student_github_evaluations');
  },
};
