import * as bodyParser from 'body-parser';
import {Action, useExpressServer} from 'routing-controllers';
import 'reflect-metadata';
import express from 'express';
import sequelizeConnection from './sequelize';
import responseTime from 'response-time';
import morgan from 'morgan';
import moment from 'moment';
import helmet from 'helmet';
import {getParsedAuthorizationHeader} from './utils/jwtUtils';
import {User} from './sequelize/models/User';
import {Role} from './sequelize/models/Role';
import {CustomErrorHandler} from './routes/middlewares/ErrorHandler';

const app = express();

app.use(express.json({limit: '50mb'}));
app.use(responseTime());
app.use(morgan((tokens, req, res) => {
    const status = tokens['status'](req, res);
    const method = tokens['method'](req, res);
    return `${moment().format('YYYY-MM-DD HH:mm:ss,SSS')} INFO [HTTP] ${status} ${method} ${req.originalUrl} [${res.getHeader('X-Response-Time')}]`;
}));
app.use(bodyParser.json());
app.use(helmet.hidePoweredBy());

const fileExtension = __filename.endsWith('.ts') ? 'ts' : 'js';

const getUserFromToken = async (authorizationHeader?: string) => {
    const parsedToken = await getParsedAuthorizationHeader(authorizationHeader);
    if (!parsedToken) {
        return null;
    }

    return User.findOne({
        where: {
            id: parsedToken.id,
            email: parsedToken.email
        },
        include: [{model: Role, as: 'role'}]
    });
};

useExpressServer(app, {
    cors: true,
    controllers: [__dirname + `/routes/controllers/*.${fileExtension}`],
    middlewares: [CustomErrorHandler],
    interceptors: [__dirname + `/routes/interceptors/*.${fileExtension}`],
    authorizationChecker: async (action: Action, roleNames: string[]) => {
        try {
            const user = await getUserFromToken(action.request.header('Authorization'));
            if (!user) {
                return false;
            }

            if (!roleNames || roleNames.length === 0) {
                return true;
            }

            const userRoleName = user.role?.name;
            return !!userRoleName && roleNames.includes(userRoleName);
        } catch (e: any) {
            console.error('Failed to validate token', e);
            return false;
        }
    },
    currentUserChecker: async (action: Action) => {
        const user = await getUserFromToken(action.request.header('Authorization'));
        if (!user) {
            return null;
        }

        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            role: user.role ? {
                id: user.role.id,
                name: user.role.name
            } : null
        };
    },
    classTransformer: true,
    validation: true,
    defaultErrorHandler: false,
});

const PORT = 3500;

sequelizeConnection.authenticate().then(() => {
    console.debug('Sequelize connection has been established successfully.');
}).catch((error) => {
    console.error('Unable to connect to the database:', error);
});

app.listen(PORT, () => {
    console.debug(`Server listening on port ${PORT}`);
});
