import { CanvasConnectionType } from "@modules/canvas/enums/canvas-connection-type.enum";
import { IsEnum, IsObject, IsOptional, IsUUID } from "class-validator";

export class CreateCanvasConnectionDto {
  @IsUUID()
  sourceObjectId!: string;

  @IsUUID()
  targetObjectId!: string;

  @IsOptional()
  @IsEnum(CanvasConnectionType)
  type?: CanvasConnectionType;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}