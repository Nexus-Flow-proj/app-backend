import { CommentDeletedPayload } from '../interfaces/socket-payloads.interface';

export class CommentDeletedEvent {
  constructor(public readonly payload: CommentDeletedPayload) {}
}
