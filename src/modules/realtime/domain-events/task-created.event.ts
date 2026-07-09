import { TaskCreatedPayload } from '../interfaces/socket-payloads.interface';

export class TaskCreatedEvent {
  constructor(public readonly payload: TaskCreatedPayload) {}
}