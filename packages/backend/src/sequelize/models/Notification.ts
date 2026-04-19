import {BelongsTo, Column, DataType, ForeignKey, Model, Table} from 'sequelize-typescript';
import {User} from './User';

export type NotificationType =
  | 'JOB_INVITED'
  | 'JOB_STATUS_CHANGED'
  | 'JOB_NEW_APPLICATION'
  | 'JOB_INVITE_RESPONSE'
  | 'EVENT_PUBLISHED';

@Table({tableName: 'notifications'})
export class Notification extends Model<Notification> {
  @Column({type: DataType.INTEGER, autoIncrement: true, primaryKey: true})
  declare id: number;

  @ForeignKey(() => User)
  @Column({type: DataType.INTEGER, allowNull: false})
  declare userId: number;

  @BelongsTo(() => User)
  declare user?: User;

  @Column({
    type: DataType.ENUM(
      'JOB_INVITED',
      'JOB_STATUS_CHANGED',
      'JOB_NEW_APPLICATION',
      'JOB_INVITE_RESPONSE',
      'EVENT_PUBLISHED',
    ),
    allowNull: false,
  })
  declare type: NotificationType;

  @Column({type: DataType.STRING(260), allowNull: false})
  declare title: string;

  @Column({type: DataType.STRING(1000), allowNull: false})
  declare message: string;

  @Column({type: DataType.TEXT, allowNull: true})
  declare payloadJson?: string | null;

  @Column({type: DataType.BOOLEAN, allowNull: false, defaultValue: false})
  declare isRead: boolean;

  @Column({type: DataType.DATE, allowNull: true})
  declare readAt?: Date | null;
}
