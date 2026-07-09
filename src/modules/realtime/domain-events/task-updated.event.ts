import { TaskUpdatedPayload } from '../interfaces/socket-payloads.interface';

export class TaskUpdatedEvent {
  constructor(public readonly payload: TaskUpdatedPayload) {}
}