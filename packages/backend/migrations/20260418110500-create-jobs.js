'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jobs', {
      id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false},
      companyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: 'companies', key: 'id'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      title: {type: Sequelize.STRING(160), allowNull: false},
      location: {type: Sequelize.STRING(140), allowNull: false},
      workMode: {type: Sequelize.ENUM('Remote', 'Hybrid', 'On-site'), allowNull: false},
      description: {type: Sequelize.TEXT, allowNull: false},
      postedAt: {type: Sequelize.DATE, allowNull: false},
      createdAt: {type: Sequelize.DATE, allowNull: false},
      updatedAt: {type: Sequelize.DATE, allowNull: false},
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('jobs');
  },
};

