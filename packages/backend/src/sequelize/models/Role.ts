import {
    AllowNull,
    Column,
    DataType,
    HasOne,
    Model,
    Table
} from 'sequelize-typescript';
import {User} from './User';

@Table({
    tableName: 'roles',
    timestamps: true,
    underscored: true
})
export class Role extends Model<Role> {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.INTEGER.UNSIGNED
    })
    declare id: number;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(100)
    })
    declare name: string;

    @HasOne(() => User, {foreignKey: 'roleId', as: 'user'})
    declare user?: User;
}
