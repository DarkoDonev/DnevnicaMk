import {Sequelize} from "sequelize-typescript";

require('dotenv').config(); //must be on top, above imported services

import {Company} from './models/Company';
import {Job} from './models/Job';
import {JobRequirement} from './models/JobRequirement';
import {Student} from './models/Student';
import {StudentSkill} from './models/StudentSkill';
import {TechSkill} from './models/TechSkill';
import {User} from './models/User';

const sequelizeConnection = new Sequelize({
    dialect: 'mysql',
    database: process.env["DB_DATABASE"]!,
    host: process.env["DB_HOST"]!,
    port: parseInt(process.env["DB_PORT"]!),
    username: process.env["DB_USER"]!,
    password: process.env["DB_PASSWORD"]!,
    models: [
        User,
        Company,
        Student,
        TechSkill,
        StudentSkill,
        Job,
        JobRequirement,
    ],
    dialectOptions: {
        connectTimeout: 15000
    },
    pool: {
        max: 30,
        min: 0,
        idle: 200000,
        // @note https://github.com/sequelize/sequelize/issues/8133#issuecomment-359993057
        acquire: 30000,
    },
    query: {
        logging: false,
    },
    logging: false,
});

export default sequelizeConnection;
