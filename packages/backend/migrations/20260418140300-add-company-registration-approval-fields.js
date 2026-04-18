'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('companies', 'registrationStatus', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    });

    await queryInterface.addColumn('companies', 'reviewedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('companies', 'reviewNote', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });

    await queryInterface.addColumn('companies', 'reviewedByUserId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {model: 'users', key: 'id'},
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.sequelize.query("UPDATE companies SET registrationStatus = 'approved'");
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('companies', 'reviewedByUserId');
    await queryInterface.removeColumn('companies', 'reviewNote');
    await queryInterface.removeColumn('companies', 'reviewedAt');
    await queryInterface.removeColumn('companies', 'registrationStatus');
  },
};
