import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import { MiniWorkshopService } from '../services/mini-workshop.service';
import { SaveMiniWorkshopDto } from '../dtos/mini-workshop/save-mini-workshop.dto';

@Controller('projects/:projectId/mini-workshop')
@UseGuards(JwtAuthGuard)
export class MiniWorkshopController {
  constructor(private readonly miniWorkshopService: MiniWorkshopService) {}

  @Get()
  async getMiniWorkshop(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.miniWorkshopService.getMiniWorkshop(
      projectId,
      user.id,
    );
    return { data };
  }

  @Patch()
  @UseGuards(CsrfGuard)
  async saveMiniWorkshop(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
    @Body() dto: SaveMiniWorkshopDto,
  ) {
    const data = await this.miniWorkshopService.saveMiniWorkshop(
      projectId,
      user.id,
      dto,
    );
    return { data };
  }
}
