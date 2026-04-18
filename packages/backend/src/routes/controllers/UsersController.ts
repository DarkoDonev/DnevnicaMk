import {Get, JsonController,} from "routing-controllers";
import {UsersService} from "../../services/UsersService";


// TODO THIS NEED TO BE IMPLEMENTED
@JsonController("/api/users")
export class UsersController {

    private usersService = new UsersService();

    @Get('')
    async findAll() {
        return {data: 'Endpoint Works!'};
    }
}
