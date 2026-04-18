import {HasOne, Column, DataType, Model, Table} from 'sequelize-typescript';
import {Company} from './Company';
import {Student} from './Student';

export type UserRole = 'student' | 'company' | 'admin';

@Table({tableName: 'users'})
export class User extends Model<User> {
  @Column({type: DataType.INTEGER, autoIncrement: true, primaryKey: true})
  declare id: number;

  @Column({type: DataType.STRING(254), allowNull: false, unique: true})
  declare email: string;

  @Column({type: DataType.STRING(100), allowNull: false})
  declare passwordHash: string;

  @Column({type: DataType.ENUM('student', 'company', 'admin'), allowNull: false})
  declare role: UserRole;

  @HasOne(() => Company)
  declare company?: Company;

  @HasOne(() => Student)
  declare student?: Student;
}
