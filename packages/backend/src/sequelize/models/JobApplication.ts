import {BelongsTo, Column, DataType, ForeignKey, Model, Table} from 'sequelize-typescript';
import {Job} from './Job';
import {Student} from './Student';

export type ApplicationStatus = 'APPLIED' | 'APPROVED' | 'HR_INTERVIEW' | 'TECHNICAL_INTERVIEW' | 'REJECTED';

@Table({tableName: 'job_applications'})
export class JobApplication extends Model<JobApplication> {
  @Column({type: DataType.INTEGER, autoIncrement: true, primaryKey: true})
  declare id: number;

  @ForeignKey(() => Job)
  @Column({type: DataType.INTEGER, allowNull: false})
  declare jobId: number;

  @BelongsTo(() => Job)
  declare job?: Job;

  @ForeignKey(() => Student)
  @Column({type: DataType.INTEGER, allowNull: false})
  declare studentId: number;

  @BelongsTo(() => Student)
  declare student?: Student;

  @Column({
    type: DataType.ENUM('APPLIED', 'APPROVED', 'HR_INTERVIEW', 'TECHNICAL_INTERVIEW', 'REJECTED'),
    allowNull: false,
    defaultValue: 'APPLIED',
  })
  declare status: ApplicationStatus;

  @Column({type: DataType.TEXT, allowNull: true})
  declare rejectionReason?: string | null;
}
