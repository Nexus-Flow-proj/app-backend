import { CommentUpdatedPayload } from '../interfaces/socket-payloads.interface';

export class CommentUpdatedEvent {
  constructor(public readonly payload: CommentUpdatedPayload) {}
}
