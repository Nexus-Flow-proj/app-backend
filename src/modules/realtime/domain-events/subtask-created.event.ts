import { SubtaskCreatedPayload } from '../interfaces/socket-payloads.interface';

export class SubtaskCreatedEvent {
  constructor(public readonly payload: SubtaskCreatedPayload) {}
}
