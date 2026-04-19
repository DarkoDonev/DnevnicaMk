'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('students', 'profileImagePath', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('students', 'profileImageOriginalName', {
      type: Sequelize.STRING(260),
      allowNull: true,
    });

    await queryInterface.addColumn('companies', 'profileImagePath', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('companies', 'profileImageOriginalName', {
      type: Sequelize.STRING(260),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('companies', 'profileImageOriginalName');
    await queryInterface.removeColumn('companies', 'profileImagePath');
    await queryInterface.removeColumn('students', 'profileImageOriginalName');
    await queryInterface.removeColumn('students', 'profileImagePath');
  },
};
