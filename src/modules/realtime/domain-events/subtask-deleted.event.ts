import { SubtaskDeletedPayload } from '../interfaces/socket-payloads.interface';

export class SubtaskDeletedEvent {
  constructor(public readonly payload: SubtaskDeletedPayload) {}
}
