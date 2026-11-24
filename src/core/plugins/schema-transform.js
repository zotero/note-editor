import { Plugin } from 'prosemirror-state';
import { schemaTransform } from '../schema/transformer';

export function transform(options) {
	return new Plugin({
		appendTransaction(transactions, oldState, newState) {
			let tr = schemaTransform(newState);
			if (!tr) {
				return null;
			}
			if (transactions.some(tr => tr.getMeta('suppressMathCleanup'))) {
				tr.setMeta('suppressMathCleanup', true);
			}
			return tr;
		}
	});
}
