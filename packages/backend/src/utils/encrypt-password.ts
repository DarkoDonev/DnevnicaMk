import * as bcrypt from 'bcryptjs';

export const encryptPassword = async (plainPassword: string) => {
    return await bcrypt.hash(plainPassword, 10);
};
