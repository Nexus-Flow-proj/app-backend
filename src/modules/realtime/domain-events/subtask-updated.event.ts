import { SubtaskUpdatedPayload } from '../interfaces/socket-payloads.interface';

export class SubtaskUpdatedEvent {
  constructor(public readonly payload: SubtaskUpdatedPayload) {}
}
