import {BelongsTo, Column, DataType, ForeignKey, HasMany, HasOne, Model, Table} from 'sequelize-typescript';
import {JobApplication} from './JobApplication';
import {StudentGithubEvaluation} from './StudentGithubEvaluation';
import {StudentSkill} from './StudentSkill';
import {User} from './User';

@Table({tableName: 'students'})
export class Student extends Model<Student> {
  @Column({type: DataType.INTEGER, autoIncrement: true, primaryKey: true})
  declare id: number;

  @ForeignKey(() => User)
  @Column({type: DataType.INTEGER, allowNull: false, unique: true})
  declare userId: number;

  @BelongsTo(() => User)
  declare user?: User;

  @Column({type: DataType.STRING(140), allowNull: false})
  declare name: string;

  @Column({type: DataType.STRING(200), allowNull: false, defaultValue: ''})
  declare headline: string;

  @Column({type: DataType.STRING(40), allowNull: true})
  declare phone?: string | null;

  @Column({type: DataType.STRING(140), allowNull: false, defaultValue: ''})
  declare location: string;

  @Column({type: DataType.STRING(300), allowNull: true})
  declare linkedInUrl?: string | null;

  @Column({type: DataType.STRING(300), allowNull: true})
  declare githubUrl?: string | null;

  @Column({type: DataType.TEXT, allowNull: true})
  declare bio?: string | null;

  @Column({type: DataType.STRING(500), allowNull: true})
  declare cvPath?: string | null;

  @Column({type: DataType.STRING(260), allowNull: true})
  declare cvOriginalName?: string | null;

  @Column({type: DataType.BOOLEAN, allowNull: false, defaultValue: false})
  declare seekingJob: boolean;

  @Column({type: DataType.BOOLEAN, allowNull: false, defaultValue: false})
  declare seekingInternship: boolean;

  @HasMany(() => StudentSkill)
  declare studentSkills?: StudentSkill[];

  @HasMany(() => JobApplication)
  declare applications?: JobApplication[];

  @HasOne(() => StudentGithubEvaluation)
  declare githubEvaluation?: StudentGithubEvaluation;
}
