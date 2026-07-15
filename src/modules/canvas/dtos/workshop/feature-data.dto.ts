export class FeatureDataDto {
  boardColumnId?: string;
  kind!: 'Feature';
  title!: string;
  description?: string;
  backgroundColor!: string;
  borderColor!: string;
}
