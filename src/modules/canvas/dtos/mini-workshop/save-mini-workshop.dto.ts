import { Type } from 'class-transformer';
import { Equals, IsDefined, IsInt, Min, ValidateNested } from 'class-validator';
import { SaveMiniWorkshopSceneDto } from './save-mini-workshop-scene.dto';

export class SaveMiniWorkshopDto {
  @Equals(2, { message: 'schemaVersion must equal 2' })
  schemaVersion!: 2;

  @IsInt()
  @Min(0)
  revision!: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => SaveMiniWorkshopSceneDto)
  scene!: SaveMiniWorkshopSceneDto;
}
