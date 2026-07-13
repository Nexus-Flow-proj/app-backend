import { CommentCreatedPayload } from '../interfaces/socket-payloads.interface';

export class CommentCreatedEvent {
  constructor(public readonly payload: CommentCreatedPayload) {}
}
