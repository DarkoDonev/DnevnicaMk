import {Column, DataType, Model, Table} from 'sequelize-typescript';

@Table({tableName: 'events'})
export class Event extends Model<Event> {
  @Column({type: DataType.INTEGER, autoIncrement: true, primaryKey: true})
  declare id: number;

  @Column({type: DataType.STRING(180), allowNull: false})
  declare sourceName: string;

  @Column({type: DataType.STRING(1000), allowNull: false})
  declare sourceUrl: string;

  @Column({type: DataType.STRING(1000), allowNull: false})
  declare eventUrl: string;

  @Column({type: DataType.STRING(260), allowNull: false})
  declare title: string;

  @Column({type: DataType.DATE, allowNull: false})
  declare startsAt: Date;

  @Column({type: DataType.STRING(220), allowNull: true})
  declare location?: string | null;

  @Column({type: DataType.TEXT, allowNull: true})
  declare snippet?: string | null;

  @Column({type: DataType.STRING(512), allowNull: false})
  declare dedupeKey: string;

  @Column({type: DataType.DATE, allowNull: false})
  declare lastSeenAt: Date;
}
