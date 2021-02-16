import { Plugin, PluginKey } from 'prosemirror-state';
import { randomString } from '../utils';

function addOrDeduplicateIDs(state) {
	let nodeIDs = [];
	let tr = state.tr;
	let updated = false;
	state.doc.descendants((node, pos) => {
		if (node.type.attrs.nodeID) {
			let nodeID = node.attrs.nodeID;
			if (!nodeID || nodeIDs.includes(nodeID)) {
				nodeID = randomString();
				tr.setNodeMarkup(pos, null, {
					...node.attrs,
					nodeID
				});
				updated = true;
			}
		}
	});

	return updated && tr || null;
}

export function nodeID(options) {
	return new Plugin({
		appendTransaction(transactions, oldState, newState) {
			return addOrDeduplicateIDs(newState);
		}
	});
}
