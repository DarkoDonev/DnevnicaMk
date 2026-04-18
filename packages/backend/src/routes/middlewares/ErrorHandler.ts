import {ExpressErrorMiddlewareInterface, HttpError, Middleware} from "routing-controllers";


@Middleware({type: 'after'})
export class CustomErrorHandler implements ExpressErrorMiddlewareInterface {
    error(error: any, request: any, response: any, next: (err: any) => any) {
        if (error instanceof HttpError) {
            response.status(error.httpCode).json({
                message: error.message
            });
            return next(null) //we don't want http errors to be logged as errors, as they are expected ones
        } else {
            console.error('unexpected error', error);
            return response.status(500).json({message: 'unexpected error'});
        }
    }

}
