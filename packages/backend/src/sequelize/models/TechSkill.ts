import {HasMany, Column, DataType, Model, Table} from 'sequelize-typescript';
import {JobRequirement} from './JobRequirement';
import {StudentSkill} from './StudentSkill';

@Table({tableName: 'tech_skills'})
export class TechSkill extends Model<TechSkill> {
  @Column({type: DataType.INTEGER, autoIncrement: true, primaryKey: true})
  declare id: number;

  @Column({type: DataType.STRING(80), allowNull: false, unique: true})
  declare name: string;

  @HasMany(() => StudentSkill)
  declare studentSkills?: StudentSkill[];

  @HasMany(() => JobRequirement)
  declare jobRequirements?: JobRequirement[];
}
