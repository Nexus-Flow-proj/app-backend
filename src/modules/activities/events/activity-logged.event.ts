export class ActivityLoggedEvent {
  constructor(
    public readonly actorId: string,
    public readonly projectId: string | null,
    public readonly message: string,
    public readonly entityType?: string,
    public readonly entityId?: string,
    public readonly projectName?: string,
  ) {}
}
