'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('events', 'companyId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {model: 'companies', key: 'id'},
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addColumn('events', 'createdByCompany', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addIndex('events', ['companyId'], {
      name: 'idx_events_company_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('events', 'idx_events_company_id');
    await queryInterface.removeColumn('events', 'createdByCompany');
    await queryInterface.removeColumn('events', 'companyId');
  },
};
