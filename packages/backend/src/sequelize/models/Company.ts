import {BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table} from 'sequelize-typescript';
import {Job} from './Job';
import {User} from './User';

export type CompanyRegistrationStatus = 'pending' | 'approved' | 'rejected';

@Table({tableName: 'companies'})
export class Company extends Model<Company> {
  @Column({type: DataType.INTEGER, autoIncrement: true, primaryKey: true})
  declare id: number;

  @ForeignKey(() => User)
  @Column({type: DataType.INTEGER, allowNull: false, unique: true})
  declare userId: number;

  @BelongsTo(() => User)
  declare user?: User;

  @Column({type: DataType.STRING(140), allowNull: false})
  declare name: string;

  @Column({type: DataType.STRING(140), allowNull: false, defaultValue: 'Remote'})
  declare location: string;

  @Column({type: DataType.STRING(300), allowNull: true})
  declare websiteUrl?: string | null;

  @Column({type: DataType.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending'})
  declare registrationStatus: CompanyRegistrationStatus;

  @Column({type: DataType.DATE, allowNull: true})
  declare reviewedAt?: Date | null;

  @Column({type: DataType.STRING(500), allowNull: true})
  declare reviewNote?: string | null;

  @ForeignKey(() => User)
  @Column({type: DataType.INTEGER, allowNull: true})
  declare reviewedByUserId?: number | null;

  @HasMany(() => Job)
  declare jobs?: Job[];
}
