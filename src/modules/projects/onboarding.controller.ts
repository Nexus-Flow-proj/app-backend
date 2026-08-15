import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { OnboardingService } from './onboarding.service';
import {
  SaveOnboardingDraftDto,
  UpdateOnboardingDraftDto,
} from './dtos/save-onboarding-draft.dto';
import { SubmitOnboardingDto } from './dtos/submit-onboarding.dto';

@Controller('projects/onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('draft')
  @UseGuards(CsrfGuard)
  async saveDraft(
    @CurrentUser() user: User,
    @Body() dto: SaveOnboardingDraftDto,
  ) {
    const data = await this.onboardingService.saveDraft(user.id, dto);
    return { message: 'Onboarding draft created successfully.', data };
  }

  @Get('draft')
  async getDrafts(@CurrentUser() user: User) {
    const data = await this.onboardingService.getDrafts(user.id);
    return { message: 'Onboarding drafts retrieved successfully.', data };
  }

  @Get('draft/:draftId')
  async getDraft(
    @CurrentUser() user: User,
    @Param('draftId', ParseUUIDPipe) draftId: string,
  ) {
    const data = await this.onboardingService.getDraft(draftId, user.id);
    return { message: 'Onboarding draft retrieved successfully.', data };
  }

  @Patch('draft/:draftId')
  @UseGuards(CsrfGuard)
  async updateDraft(
    @CurrentUser() user: User,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body() dto: UpdateOnboardingDraftDto,
  ) {
    const data = await this.onboardingService.updateDraft(
      draftId,
      user.id,
      dto,
    );
    return { message: 'Onboarding draft updated successfully.', data };
  }

  @Delete('draft/:draftId')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async deleteDraft(
    @CurrentUser() user: User,
    @Param('draftId', ParseUUIDPipe) draftId: string,
  ) {
    await this.onboardingService.deleteDraft(draftId, user.id);
    return { message: 'Onboarding draft deleted successfully.', data: null };
  }

  @Post('submit')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitOnboarding(
    @CurrentUser() user: User,
    @Body() dto: SubmitOnboardingDto,
  ) {
    const data = await this.onboardingService.submitOnboarding(user.id, dto);
    return {
      message: 'Onboarding project submitted and created successfully.',
      data,
    };
  }
}
