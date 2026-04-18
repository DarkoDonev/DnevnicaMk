import {BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table} from 'sequelize-typescript';
import {Company} from './Company';
import {JobRequirement} from './JobRequirement';

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';

@Table({tableName: 'jobs'})
export class Job extends Model<Job> {
  @Column({type: DataType.INTEGER, autoIncrement: true, primaryKey: true})
  declare id: number;

  @ForeignKey(() => Company)
  @Column({type: DataType.INTEGER, allowNull: false})
  declare companyId: number;

  @BelongsTo(() => Company)
  declare company?: Company;

  @Column({type: DataType.STRING(160), allowNull: false})
  declare title: string;

  @Column({type: DataType.STRING(140), allowNull: false})
  declare location: string;

  @Column({type: DataType.ENUM('Remote', 'Hybrid', 'On-site'), allowNull: false})
  declare workMode: WorkMode;

  @Column({type: DataType.TEXT, allowNull: false})
  declare description: string;

  @Column({type: DataType.DATE, allowNull: false})
  declare postedAt: Date;

  @HasMany(() => JobRequirement)
  declare requirements?: JobRequirement[];
}
