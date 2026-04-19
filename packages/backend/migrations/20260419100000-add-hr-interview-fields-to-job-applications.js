'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('job_applications', 'hrInterviewAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('job_applications', 'hrInterviewLocation', {
      type: Sequelize.STRING(260),
      allowNull: true,
    });

    await queryInterface.addColumn('job_applications', 'hrInterviewInfo', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('job_applications', 'hrInterviewInfo');
    await queryInterface.removeColumn('job_applications', 'hrInterviewLocation');
    await queryInterface.removeColumn('job_applications', 'hrInterviewAt');
  },
};
