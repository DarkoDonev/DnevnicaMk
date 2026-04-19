'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false},
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: 'users', key: 'id'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(
          'JOB_INVITED',
          'JOB_STATUS_CHANGED',
          'JOB_NEW_APPLICATION',
          'JOB_INVITE_RESPONSE',
          'EVENT_PUBLISHED',
        ),
        allowNull: false,
      },
      title: {type: Sequelize.STRING(260), allowNull: false},
      message: {type: Sequelize.STRING(1000), allowNull: false},
      payloadJson: {type: Sequelize.TEXT, allowNull: true},
      isRead: {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
      readAt: {type: Sequelize.DATE, allowNull: true},
      createdAt: {type: Sequelize.DATE, allowNull: false},
      updatedAt: {type: Sequelize.DATE, allowNull: false},
    });

    await queryInterface.addIndex('notifications', ['userId', 'isRead'], {
      name: 'idx_notifications_user_is_read',
    });

    await queryInterface.addIndex('notifications', ['userId', 'createdAt'], {
      name: 'idx_notifications_user_created_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
  },
};
