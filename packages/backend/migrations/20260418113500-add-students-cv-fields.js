'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('students', 'cvPath', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('students', 'cvOriginalName', {
      type: Sequelize.STRING(260),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('students', 'cvOriginalName');
    await queryInterface.removeColumn('students', 'cvPath');
  },
};

