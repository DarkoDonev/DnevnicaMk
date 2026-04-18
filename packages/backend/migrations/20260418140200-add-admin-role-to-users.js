'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'role', {
      type: Sequelize.ENUM('student', 'company', 'admin'),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("UPDATE users SET role = 'student' WHERE role = 'admin'");
    await queryInterface.changeColumn('users', 'role', {
      type: Sequelize.ENUM('student', 'company'),
      allowNull: false,
    });
  },
};
