'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false},
      email: {type: Sequelize.STRING(254), allowNull: false, unique: true},
      passwordHash: {type: Sequelize.STRING(100), allowNull: false},
      role: {type: Sequelize.ENUM('student', 'company'), allowNull: false},
      createdAt: {type: Sequelize.DATE, allowNull: false},
      updatedAt: {type: Sequelize.DATE, allowNull: false},
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};

