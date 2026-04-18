'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('job_applications', {
      id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false},
      jobId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: 'jobs', key: 'id'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      studentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: 'students', key: 'id'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('APPLIED', 'APPROVED', 'HR_INTERVIEW', 'TECHNICAL_INTERVIEW', 'REJECTED'),
        allowNull: false,
        defaultValue: 'APPLIED',
      },
      rejectionReason: {type: Sequelize.TEXT, allowNull: true},
      createdAt: {type: Sequelize.DATE, allowNull: false},
      updatedAt: {type: Sequelize.DATE, allowNull: false},
    });

    await queryInterface.addIndex('job_applications', ['jobId', 'studentId'], {
      unique: true,
      name: 'uniq_job_student_application',
    });
    await queryInterface.addIndex('job_applications', ['jobId'], {name: 'idx_job_applications_job'});
    await queryInterface.addIndex('job_applications', ['studentId'], {name: 'idx_job_applications_student'});
  },

  async down(queryInterface) {
    await queryInterface.dropTable('job_applications');
  },
};
