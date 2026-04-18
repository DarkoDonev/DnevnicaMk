import {BelongsTo, Column, DataType, ForeignKey, Model, Table} from 'sequelize-typescript';
import {Company} from './Company';

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

  @ForeignKey(() => Company)
  @Column({type: DataType.INTEGER, allowNull: true})
  declare companyId?: number | null;

  @BelongsTo(() => Company)
  declare company?: Company;

  @Column({type: DataType.BOOLEAN, allowNull: false, defaultValue: false})
  declare createdByCompany: boolean;

  @Column({type: DataType.STRING(512), allowNull: false})
  declare dedupeKey: string;

  @Column({type: DataType.DATE, allowNull: false})
  declare lastSeenAt: Date;
}
