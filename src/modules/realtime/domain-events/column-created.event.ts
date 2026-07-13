import { ColumnCreatedPayload } from '../interfaces/socket-payloads.interface';

export class ColumnCreatedEvent {
  constructor(public readonly payload: ColumnCreatedPayload) {}
}
