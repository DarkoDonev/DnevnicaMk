import * as bodyParser from 'body-parser';
import {Action, useExpressServer} from 'routing-controllers';
import 'reflect-metadata';
import express from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';

import sequelizeConnection from "./sequelize";
import responseTime from "response-time";
import morgan from "morgan";
import moment from "moment";
import helmet from 'helmet';
//Start the worker



const app = express();

app.use(express.json({limit: '50mb'})); // Setting body size limit
// Morgan
const removeCredentials = (data: any) => {
    if (data.password) {
        data.password = '********'
    }
    if (data.verify) {
        data.verify = '********'
    }
    if (data.shared_secret) {
        data.shared_secret = '****************'
    }
    return data;
}
app.use(responseTime());
app.use(morgan((tokens, req, res) => {
    // Cast req.user to User type
    // TODO IMPLEMENT THIS
    let user = null;
    return user;
}));

// Body Parser
app.use(bodyParser.json());

// Helmet
app.use(helmet.hidePoweredBy());

// Serve uploaded files and other static assets
const staticRoot = path.resolve(__dirname, '../static');
app.use('/static', express.static(staticRoot));

const fileExtension = __filename.endsWith('.ts') ? 'ts' : 'js';

useExpressServer(app, {
    cors: true,
    controllers: [__dirname + `/routes/controllers/*.${fileExtension}`],
    middlewares: [__dirname + `/routes/middlewares/*.${fileExtension}`],
    interceptors: [__dirname + `/routes/interceptors/*.${fileExtension}`],
    authorizationChecker: async (action: Action, roleNames: string[]) => {
        try {
            const authHeader = action.request.headers?.authorization as string | undefined;
            if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

            const token = authHeader.slice('Bearer '.length).trim();
            if (!token) return false;

            const secret = process.env['JWT_SECRET_KEY'] || 'dev-secret-change-me';
            const payload = jwt.verify(token, secret);
            (action.request as any).user = payload;

            if (roleNames?.length) {
                const role = (payload as any)?.role;
                return roleNames.includes(role);
            }
            return true;
        } catch (e: any) {
            console.error('Failed to validate token', e);
            return false;
        }
    },
    currentUserChecker: async (action: Action) => {
        return (action.request as any).user ?? null;
    },

    classTransformer: true,
    validation: true,
    defaultErrorHandler: false,
});

const PORT = 3500;


app.use(bodyParser.json());
// app.use(cors());

sequelizeConnection.authenticate().then(() => {
    console.debug('Sequelize connection has been established successfully.')
}).catch((error) => {
    console.error("Unable to connect to the database:", error)
})

app.listen(PORT, () => {})
