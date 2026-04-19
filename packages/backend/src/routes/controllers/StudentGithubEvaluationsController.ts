import {Authorized, BadRequestError, CurrentUser, Get, JsonController, Param, Post, QueryParam} from 'routing-controllers';

import {StudentGithubEvaluationService} from '../../services/StudentGithubEvaluationService';

@JsonController('/api/students')
export class StudentGithubEvaluationsController {
  private readonly evaluation = new StudentGithubEvaluationService();

  @Authorized('student')
  @Post('/me/github-evaluation/run')
  async runMyEvaluation(@CurrentUser() user: any, @QueryParam('force') forceRaw?: string) {
    const force = ['1', 'true', 'yes'].includes(String(forceRaw ?? '').toLowerCase());
    const data = await this.evaluation.runForStudentUser(Number(user?.sub), force);
    return {data};
  }

  @Authorized('company')
  @Post('/:studentId/github-evaluation/run')
  async run(@Param('studentId') studentIdRaw: string, @QueryParam('force') forceRaw?: string) {
    const studentId = Number(studentIdRaw);
    if (!Number.isFinite(studentId) || studentId <= 0) throw new BadRequestError('Invalid studentId.');

    const force = ['1', 'true', 'yes'].includes(String(forceRaw ?? '').toLowerCase());
    const data = await this.evaluation.runForCompany(studentId, force);
    return {data};
  }

  @Authorized('student')
  @Get('/me/github-evaluation')
  async myDetails(@CurrentUser() user: any) {
    const data = await this.evaluation.getForStudentUser(Number(user?.sub));
    return {data};
  }

  @Authorized('company')
  @Get('/:studentId/github-evaluation')
  async details(@Param('studentId') studentIdRaw: string) {
    const studentId = Number(studentIdRaw);
    if (!Number.isFinite(studentId) || studentId <= 0) throw new BadRequestError('Invalid studentId.');

    const data = await this.evaluation.getForCompany(studentId);
    return {data};
  }
}
