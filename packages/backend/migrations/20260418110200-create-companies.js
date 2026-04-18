'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('companies', {
      id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false},
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {model: 'users', key: 'id'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: {type: Sequelize.STRING(140), allowNull: false},
      location: {type: Sequelize.STRING(140), allowNull: false, defaultValue: 'Remote'},
      websiteUrl: {type: Sequelize.STRING(300), allowNull: true},
      createdAt: {type: Sequelize.DATE, allowNull: false},
      updatedAt: {type: Sequelize.DATE, allowNull: false},
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('companies');
  },
};

