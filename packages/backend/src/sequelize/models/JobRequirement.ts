import {BelongsTo, Column, DataType, ForeignKey, Model, Table} from 'sequelize-typescript';
import {Job} from './Job';
import {TechSkill} from './TechSkill';

@Table({tableName: 'job_requirements'})
export class JobRequirement extends Model<JobRequirement> {
  @Column({type: DataType.INTEGER, autoIncrement: true, primaryKey: true})
  declare id: number;

  @ForeignKey(() => Job)
  @Column({type: DataType.INTEGER, allowNull: false})
  declare jobId: number;

  @BelongsTo(() => Job)
  declare job?: Job;

  @ForeignKey(() => TechSkill)
  @Column({type: DataType.INTEGER, allowNull: false})
  declare techSkillId: number;

  @BelongsTo(() => TechSkill)
  declare techSkill?: TechSkill;

  @Column({type: DataType.INTEGER, allowNull: false, defaultValue: 0})
  declare minYears: number;
}
