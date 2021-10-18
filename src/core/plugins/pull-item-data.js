import { Plugin, PluginKey } from 'prosemirror-state';

function extract(state) {
	let items = [];
	let tr = state.tr;
	let updated = false;
	state.doc.descendants((node, pos) => {
		try {
			let citationItems;
			if (node.attrs.citation) {
				citationItems = node.attrs.citation.citationItems
			}
			else if (node.attrs.annotation
				&& node.attrs.annotation.citationItem) {
				citationItems = [node.attrs.annotation.citationItem];
			}

			if (citationItems) {
				for (let citationItem of citationItems) {
					if (citationItem.itemData) {
						let { uris, itemData } = citationItem;
						let item = { uris, itemData };
						items.push(item);
						delete citationItem.itemData;
						updated = true;
					}
				}

				if (updated) {
					tr.setNodeMarkup(pos, null, node.attrs);
				}
			}
		}
		catch(e) {
			console.log(e);
		}
	});

	return updated && { tr, items } || null;
}

export function pullItemData(options) {
	return new Plugin({
		appendTransaction(transactions, oldState, newState) {
			let changed = transactions.some(tr => tr.docChanged);
			if (!changed) return;
			let res = extract(newState);
			if (!res) {
				return null;
			}
			let { tr, items } = res;
			options.onPull(items);
			return tr;
		}
	});
}
