import { TaskDeletedPayload } from '../interfaces/socket-payloads.interface';

export class TaskDeletedEvent {
  constructor(public readonly payload: TaskDeletedPayload) {}
}