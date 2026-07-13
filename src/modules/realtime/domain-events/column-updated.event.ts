import { ColumnUpdatedPayload } from '../interfaces/socket-payloads.interface';

export class ColumnUpdatedEvent {
  constructor(public readonly payload: ColumnUpdatedPayload) {}
}
