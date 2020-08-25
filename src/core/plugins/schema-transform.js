import { Plugin } from 'prosemirror-state';
import { schemaTransform } from '../schema/transformer';

export function transform(options) {
  return new Plugin({
    appendTransaction(transactions, oldState, newState) {
      return schemaTransform(newState);
    }
  });
}
