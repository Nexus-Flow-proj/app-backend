import { ColumnDeletedPayload } from '../interfaces/socket-payloads.interface';

export class ColumnDeletedEvent {
  constructor(public readonly payload: ColumnDeletedPayload) {}
}
