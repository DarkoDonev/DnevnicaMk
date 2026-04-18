'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('students', {
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
      headline: {type: Sequelize.STRING(200), allowNull: false, defaultValue: ''},
      phone: {type: Sequelize.STRING(40), allowNull: true},
      location: {type: Sequelize.STRING(140), allowNull: false, defaultValue: ''},
      linkedInUrl: {type: Sequelize.STRING(300), allowNull: true},
      githubUrl: {type: Sequelize.STRING(300), allowNull: true},
      bio: {type: Sequelize.TEXT, allowNull: true},
      createdAt: {type: Sequelize.DATE, allowNull: false},
      updatedAt: {type: Sequelize.DATE, allowNull: false},
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('students');
  },
};

