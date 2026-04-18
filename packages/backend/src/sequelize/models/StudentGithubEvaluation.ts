import {BelongsTo, Column, DataType, ForeignKey, Model, Table} from 'sequelize-typescript';

import {Student} from './Student';

export type StudentGithubEvaluationStatus = 'pending' | 'ready' | 'failed';

@Table({tableName: 'student_github_evaluations'})
export class StudentGithubEvaluation extends Model<StudentGithubEvaluation> {
  @Column({type: DataType.INTEGER, autoIncrement: true, primaryKey: true})
  declare id: number;

  @ForeignKey(() => Student)
  @Column({type: DataType.INTEGER, allowNull: false, unique: true})
  declare studentId: number;

  @BelongsTo(() => Student)
  declare student?: Student;

  @Column({
    type: DataType.ENUM('pending', 'ready', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  })
  declare status: StudentGithubEvaluationStatus;

  @Column({type: DataType.INTEGER, allowNull: true})
  declare overallScore?: number | null;

  @Column({type: DataType.INTEGER, allowNull: true})
  declare codeQualityScore?: number | null;

  @Column({type: DataType.INTEGER, allowNull: true})
  declare consistencyScore?: number | null;

  @Column({type: DataType.INTEGER, allowNull: true})
  declare activityScore?: number | null;

  @Column({type: DataType.INTEGER, allowNull: true})
  declare documentationScore?: number | null;

  @Column({type: DataType.TEXT('long'), allowNull: true})
  declare summaryMk?: string | null;

  @Column({type: DataType.TEXT('long'), allowNull: true})
  declare strengthsJson?: string | null;

  @Column({type: DataType.TEXT('long'), allowNull: true})
  declare improvementsJson?: string | null;

  @Column({type: DataType.TEXT('long'), allowNull: true})
  declare reposAnalyzedJson?: string | null;

  @Column({type: DataType.TEXT('long'), allowNull: true})
  declare metricsJson?: string | null;

  @Column({type: DataType.DATE, allowNull: true})
  declare lastAnalyzedAt?: Date | null;

  @Column({type: DataType.DATE, allowNull: true})
  declare cacheExpiresAt?: Date | null;

  @Column({type: DataType.TEXT('long'), allowNull: true})
  declare lastError?: string | null;
}
