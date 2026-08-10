export class MiniWorkshopResponseDto {
  id!: string | null;
  projectId!: string;
  ownerId!: string | null;
  schemaVersion!: 2;
  revision!: number;
  scene!: {
    viewport: { x: number; y: number; scale: number };
    objects: any[];
    connections: any[];
    assets: Record<string, any>;
  };
  createdAt!: string | null;
  updatedAt!: string | null;
}
