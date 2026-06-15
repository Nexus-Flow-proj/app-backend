import { registerDecorator, ValidationOptions } from 'class-validator';
import { MatchConstraint } from '../validators/match.constraint';

export function Match(
  property: string,
  validationOptions?: ValidationOptions,
): (target: object, propertyKey: string | symbol) => void {
  return (target, propertyKey) => {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}
