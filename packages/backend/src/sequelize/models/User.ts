import {
    AllowNull,
    BelongsTo,
    Column,
    DataType,
    ForeignKey,
    Model,
    Table,
    Unique
} from 'sequelize-typescript';
import {Role} from './Role';

@Table({
    tableName: 'users',
    timestamps: true,
    underscored: true
})
export class User extends Model<User> {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.INTEGER.UNSIGNED
    })
    declare id: number;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(100),
        field: 'first_name'
    })
    declare firstName: string;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(100),
        field: 'last_name'
    })
    declare lastName: string;

    @Unique
    @AllowNull(false)
    @Column({
        type: DataType.STRING(190)
    })
    declare email: string;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(255),
        field: 'password_hash'
    })
    declare passwordHash: string;

    @AllowNull(false)
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
        field: 'is_email_verified'
    })
    declare isEmailVerified: boolean;

    @Unique
    @ForeignKey(() => Role)
    @AllowNull(false)
    @Column({
        type: DataType.INTEGER.UNSIGNED,
        field: 'role_id'
    })
    declare roleId: number;

    @BelongsTo(() => Role, {foreignKey: 'roleId', as: 'role'})
    declare role?: Role;
}
