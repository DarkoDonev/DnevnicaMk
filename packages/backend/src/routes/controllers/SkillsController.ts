import {Get, JsonController} from 'routing-controllers';

import {TechSkill} from '../../sequelize/models/TechSkill';

@JsonController('/api/skills')
export class SkillsController {
  @Get('')
  async list() {
    const skills = await TechSkill.findAll({order: [['name', 'ASC']]});
    return {data: skills.map((s) => s.name)};
  }
}

