'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('events', {
      id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false},
      sourceName: {type: Sequelize.STRING(180), allowNull: false},
      sourceUrl: {type: Sequelize.STRING(1000), allowNull: false},
      eventUrl: {type: Sequelize.STRING(1000), allowNull: false},
      title: {type: Sequelize.STRING(260), allowNull: false},
      startsAt: {type: Sequelize.DATE, allowNull: false},
      location: {type: Sequelize.STRING(220), allowNull: true},
      snippet: {type: Sequelize.TEXT, allowNull: true},
      dedupeKey: {type: Sequelize.STRING(512), allowNull: false},
      lastSeenAt: {type: Sequelize.DATE, allowNull: false},
      createdAt: {type: Sequelize.DATE, allowNull: false},
      updatedAt: {type: Sequelize.DATE, allowNull: false},
    });

    await queryInterface.addIndex('events', ['dedupeKey'], {
      unique: true,
      name: 'uniq_events_dedupe_key',
    });

    await queryInterface.addIndex('events', ['startsAt'], {
      name: 'idx_events_starts_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('events');
  },
};
