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
import { WorkshopCanvasService } from '../services/workshop-canvas.service';
import { SaveWorkshopCanvasDto } from '../dtos/workshop/save-workshop-canvas.dto';

@Controller('projects/onboarding/draft/:draftId/workshop')
@UseGuards(JwtAuthGuard)
export class WorkshopCanvasController {
  constructor(
    private readonly workshopCanvasService: WorkshopCanvasService,
  ) {}

  @Get()
  async getDraftWorkshop(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.workshopCanvasService.getDraftWorkshop(
      draftId,
      user.id,
    );
    return { message: 'Workshop loaded successfully.', data };
  }

  @Patch()
  @UseGuards(CsrfGuard)
  async saveDraftWorkshop(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @CurrentUser() user: User,
    @Body() dto: SaveWorkshopCanvasDto,
  ) {
    const data = await this.workshopCanvasService.saveDraftWorkshop(
      draftId,
      user.id,
      dto,
    );
    return { message: 'Workshop saved successfully.', data };
  }
}
