import { TextSelection } from 'prosemirror-state';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { schema } from '../schema';
import { removeDiacritics } from '../utils';

class Search {
	constructor(options = {}) {
		this.active = false;
		this.searchTerm = '';
		this.caseSensitive = false;
		this.wholeWords = false;
		this.findClass = 'find';
		this.findSelectedClass = 'find-selected';

		this.decorations = DecorationSet.empty;
		this.results = [];
		this.selectedResultIndex = 0;
		this.triggerUpdate = true;
	}

	focusSelectedResult() {
		setTimeout(() => {
			let node = this.view.dom.querySelector('.' + this.findSelectedClass);
			if (node) {
				node.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		});
	}

	setActive(active) {
		let { state, dispatch } = this.view;
		this.active = active;
		if (!active) {
			// up/down arrow keys doesn't work in Firefox if editor area is not focused
			this.view.dom.focus();
		}
		this.triggerUpdate = true;
		dispatch(state.tr);
	}

	setSearchTerm(searchTerm) {
		let { state, dispatch } = this.view;
		this.searchTerm = searchTerm;
		this.triggerUpdate = true;
		this.triggerFocus = true;
		this.selectedResultIndex = 0;
		dispatch(state.tr);
	}

	setWholeWords(enable) {
		let { state, dispatch } = this.view;
		this.wholeWords = enable;
		this.triggerUpdate = true;
		dispatch(state.tr);
	}

	setCaseSensitive(enable) {
		let { state, dispatch } = this.view;
		this.caseSensitive = enable;
		this.triggerUpdate = true;
		dispatch(state.tr);
	}

	prev() {
		let { state, dispatch } = this.view;
		let { tr } = state;

		if (!this.results.length) {
			return;
		}

		let pos = state.selection.from;
		let index = this.results.slice().reverse().findIndex(x => x.to < pos);
		this.selectedResultIndex = index === -1 ? this.results.length - 1 : this.results.length - index - 1;
		let result = this.results[this.selectedResultIndex];
		tr.setSelection(TextSelection.between(state.doc.resolve(result.from), state.doc.resolve(result.from)));

		this.triggerUpdate = true;
		dispatch(tr);

		this.focusSelectedResult();
	}

	next() {
		let { state, dispatch } = this.view;
		let { tr } = state;

		if (!this.results.length) {
			return;
		}

		let pos = state.selection.from;
		let index = this.results.findIndex(x => x.from > pos);
		this.selectedResultIndex = index === -1 ? 0 : index;
		let result = this.results[this.selectedResultIndex];
		tr.setSelection(TextSelection.between(state.doc.resolve(result.from), state.doc.resolve(result.from)));

		this.triggerUpdate = true;
		dispatch(tr);
		this.focusSelectedResult();
	}

	search(doc) {
		this.results = [];
		let mergedTextNodes = [];
		let index = 0;

		if (!this.searchTerm) {
			return;
		}

		let searchTerm = this.searchTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
		searchTerm = removeDiacritics(searchTerm);
		let searchRe = new RegExp(
			this.wholeWords ? `\\b(${searchTerm})\\b` : searchTerm,
			!this.caseSensitive ? 'gui' : 'gu'
		);

		doc.descendants((node, pos) => {
			if (node.isText) {
				let text = removeDiacritics(node.text);
				if (mergedTextNodes[index]) {
					mergedTextNodes[index] = {
						text: mergedTextNodes[index].text + text,
						pos: mergedTextNodes[index].pos
					};
				}
				else {
					mergedTextNodes[index] = { text, pos };
				}
			}
			else {
				index += 1;
				if (node.type === schema.nodes.citation) {
					let res = this.view.domAtPos(pos);
					if (res) {
						let text = res.node.childNodes[res.offset].innerText;
						text = removeDiacritics(text);
						mergedTextNodes[index++] = { text, pos, isCitation: true };
					}
				}
			}
		});

		mergedTextNodes.forEach(({ text, pos, isCitation }) => {
			searchRe.lastIndex = 0;
			let m;
			while ((m = searchRe.exec(text))) {
				if (m[0] === '') {
					break;
				}

				if (isCitation) {
					this.results.push({
						from: pos,
						to: pos + 1,
						isCitation
					});
				}
				else {
					this.results.push({
						from: pos + m.index,
						to: pos + m.index + m[0].length
					});
				}
			}
		});
	}

	replace(replace) {
		let { state, dispatch } = this.view;
		let { tr } = state;

		if (!this.results.length) {
			return;
		}
		let result = this.results[this.selectedResultIndex];

		this.triggerUpdate = true;
		this.triggerFocus = true;

		if (result.isCitation) {
			tr.setSelection(TextSelection.between(tr.doc.resolve(result.to), tr.doc.resolve(result.to)));
		}
		else {
			tr.insertText(replace, result.from, result.to);
			tr.setSelection(TextSelection.between(tr.doc.resolve(result.from + replace.length), tr.doc.resolve(result.from + replace.length)));
		}
		dispatch(tr);
	}

	replaceAll(replace) {
		let { state, dispatch } = this.view;
		let tr = state.tr;
		for (let result of this.results) {
			if (result.isCitation) {
				continue;
			}
			tr.insertText(replace, tr.mapping.map(result.from), tr.mapping.map(result.to));
		}
		dispatch(tr);
	}

	updateState(tr) {
		if (this.active) {
			if (tr.docChanged) {
				this.triggerUpdate = true;
			}
		}
		else {
			this.decorations = DecorationSet.empty;
		}
	}

	updateView() {
		if (this.triggerUpdate) {
			this.triggerUpdate = false;

			let { state, dispatch } = this.view;
			let { tr } = state;

			this.search(tr.doc);

			if (this.triggerFocus && this.results.length) {
				this.triggerFocus = false;
				let pos = state.selection.from;
				let index = this.results.findIndex(x => x.from >= pos);
				this.selectedResultIndex = index === -1 ? 0 : index;
				let result = this.results[this.selectedResultIndex];
				tr.setSelection(TextSelection.between(state.doc.resolve(result.from), state.doc.resolve(result.from)));
				this.focusSelectedResult();
			}
			let list = this.results.map((deco, index) => (
				Decoration.inline(deco.from, deco.to, {
					class: index === this.selectedResultIndex
						? this.findSelectedClass : this.findClass
				})
			));
			this.decorations = DecorationSet.create(tr.doc, list);
			dispatch(tr);
		}
	}
}

export let searchKey = new PluginKey('search');

export function search() {
	return new Plugin({
		key: searchKey,
		state: {
			init() {
				return new Search();
			},
			apply: (tr, pluginState) => {
				pluginState.updateState(tr);
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = searchKey.getState(view.state);
			pluginState.view = view;
			return {
				update(view, lastState) {
					pluginState.updateView(view.state, lastState);
				}
			};
		},
		props: {
			decorations(state) {
				return this.getState(state).decorations;
			}
		}
	});
}
