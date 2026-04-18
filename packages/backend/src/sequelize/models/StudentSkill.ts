import {BelongsTo, Column, DataType, ForeignKey, Model, Table} from 'sequelize-typescript';
import {Student} from './Student';
import {TechSkill} from './TechSkill';

@Table({tableName: 'student_skills'})
export class StudentSkill extends Model<StudentSkill> {
  @Column({type: DataType.INTEGER, autoIncrement: true, primaryKey: true})
  declare id: number;

  @ForeignKey(() => Student)
  @Column({type: DataType.INTEGER, allowNull: false})
  declare studentId: number;

  @BelongsTo(() => Student)
  declare student?: Student;

  @ForeignKey(() => TechSkill)
  @Column({type: DataType.INTEGER, allowNull: false})
  declare techSkillId: number;

  @BelongsTo(() => TechSkill)
  declare techSkill?: TechSkill;

  @Column({type: DataType.INTEGER, allowNull: false, defaultValue: 0})
  declare yearsOfExperience: number;
}
