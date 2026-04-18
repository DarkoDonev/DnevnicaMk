'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('job_applications', 'status', {
      type: Sequelize.ENUM(
        'INVITED',
        'APPLIED',
        'APPROVED',
        'HR_INTERVIEW',
        'TECHNICAL_INTERVIEW',
        'DONE',
        'DECLINED',
        'REJECTED',
      ),
      allowNull: false,
      defaultValue: 'APPLIED',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("UPDATE job_applications SET status = 'APPLIED' WHERE status = 'INVITED'");
    await queryInterface.sequelize.query("UPDATE job_applications SET status = 'REJECTED' WHERE status = 'DECLINED'");
    await queryInterface.sequelize.query("UPDATE job_applications SET status = 'HR_INTERVIEW' WHERE status = 'DONE'");

    await queryInterface.changeColumn('job_applications', 'status', {
      type: Sequelize.ENUM('APPLIED', 'APPROVED', 'HR_INTERVIEW', 'TECHNICAL_INTERVIEW', 'REJECTED'),
      allowNull: false,
      defaultValue: 'APPLIED',
    });
  },
};
