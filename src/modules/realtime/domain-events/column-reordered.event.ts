import { ColumnReorderedPayload } from '../interfaces/socket-payloads.interface';

export class ColumnReorderedEvent {
  constructor(public readonly payload: ColumnReorderedPayload) {}
}
