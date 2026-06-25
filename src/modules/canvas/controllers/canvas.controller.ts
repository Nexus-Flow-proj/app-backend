import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CanvasService } from '../services/canvas.service';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { UpdateCanvasViewportDto } from '../dtos/canvas/update-canvas-viewport.dto';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { CreateCanvasObjectDto } from '../dtos/object/create-canvas-object.dto';
import { UpdateCanvasObjectDto } from '../dtos/object/update-canvas-object.dto';

@Controller('canvas')
@UseGuards(JwtAuthGuard)
export class CanvasController {
  constructor(private readonly canvasService: CanvasService) {}

  @Get('projects/:projectId/project')
  getProjectCanvas(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.canvasService.getProjectCanvas(projectId, user.id);
  }

  @Get('projects/:projectId/me')
  getMyCanvas(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.canvasService.getMyCanvas(projectId, user.id);
  }

  @Patch(':canvasId/viewport')
  @UseGuards(CsrfGuard)
  updateCanvasViewport(
    @Param('canvasId') canvasId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateCanvasViewportDto,
  ) {
    return this.canvasService.updateCanvasViewport(canvasId, user.id, dto);
  }

  @Get(':canvasId/objects')
  getCanvasObjects(
    @Param('canvasId') canvasId: string,
    @CurrentUser() user: User,
  ) {
    return this.canvasService.getCanvasObjects(canvasId, user.id);
  }

  @Post(':canvasId/objects')
  @UseGuards(CsrfGuard)
  createCanvasObject(
    @Param('canvasId') canvasId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateCanvasObjectDto,
  ) {
    return this.canvasService.createCanvasObject(canvasId, user.id, dto);
  }

  @Patch('objects/:objectId')
  @UseGuards(CsrfGuard)
  updateCanvasObject(
    @Param('objectId') objectId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateCanvasObjectDto,
  ) {
    return this.canvasService.updateCanvasObject(objectId, user.id, dto);
  }

  @Delete('objects/:objectId')
  @UseGuards(CsrfGuard)
  deleteCanvasObject(
    @Param('objectId') objectId: string,
    @CurrentUser() user: User,
  ) {
    return this.canvasService.deleteCanvasObject(objectId, user.id);
  }
}
