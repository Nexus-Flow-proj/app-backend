import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { ProjectAuthGuard } from '@shared/guards/project-auth.guard';
import { RequirePermission } from '@shared/decorators/require-permission.decorator';
import { WorkshopCanvasService } from '../services/workshop-canvas.service';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { SaveWorkshopCanvasDto } from '../dtos/workshop/save-workshop-canvas.dto';

@Controller('projects/:projectId/canvas')
@UseGuards(JwtAuthGuard, ProjectAuthGuard)
export class WorkshopCanvasController {
  constructor(private readonly workshopCanvasService: WorkshopCanvasService) {}

  @Get()
  @RequirePermission('workshop', 'read')
  async getWorkshopCanvas(@Param('projectId') projectId: string) {
    const data = await this.workshopCanvasService.getWorkshopCanvas(projectId);
    return { message: 'Canvas loaded', data };
  }

  @Patch()
  @UseGuards(CsrfGuard)
  @RequirePermission('workshop', 'updateNodes')
  async saveWorkshopCanvas(
    @Param('projectId') projectId: string,
    @Body() dto: SaveWorkshopCanvasDto,
  ) {
    return this.workshopCanvasService.saveWorkshopCanvas(projectId, dto);
  }
}
