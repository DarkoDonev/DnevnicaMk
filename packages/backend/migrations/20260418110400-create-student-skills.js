'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_skills', {
      id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false},
      studentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: 'students', key: 'id'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      techSkillId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: 'tech_skills', key: 'id'},
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      yearsOfExperience: {type: Sequelize.INTEGER, allowNull: false, defaultValue: 0},
      createdAt: {type: Sequelize.DATE, allowNull: false},
      updatedAt: {type: Sequelize.DATE, allowNull: false},
    });

    await queryInterface.addIndex('student_skills', ['studentId', 'techSkillId'], {
      unique: true,
      name: 'uniq_student_skill',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('student_skills');
  },
};

