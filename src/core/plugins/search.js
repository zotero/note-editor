import { TextSelection } from 'prosemirror-state';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

// TODO: Keyboard navigation
// TODO: Focus the first result when typing
// TODO: Search in citations

class Search {
	constructor(options = {}) {
		this.active = false;
		this.searchTerm = '';
		this.caseSensitive = false;
		this.wholeWords = false;
		this.findClass = 'find';

		this.decorations = DecorationSet.empty;
		this.results = [];
		this.needsUpdate = true;
	}

	setActive(active) {
		let { state, dispatch } = this.view;
		this.active = active;
		if (!active) {
			// up/down arrow keys doesn't work in Firefox if editor area is not focused
			this.view.dom.focus();
		}
		this.needsUpdate = true;
		dispatch(state.tr);
	}

	setSearchTerm(searchTerm) {
		let { state, dispatch } = this.view;
		this.searchTerm = searchTerm;
		this.needsUpdate = true;
		this.needsFocus = true;
		dispatch(state.tr);
	}

	setWholeWords(enable) {
		let { state, dispatch } = this.view;
		this.wholeWords = enable;
		this.needsUpdate = true;
		dispatch(state.tr);
	}

	setCaseSensitive(enable) {
		let { state, dispatch } = this.view;
		this.caseSensitive = enable;
		this.needsUpdate = true;
		dispatch(state.tr);
	}

	prev() {
		this.view.dom.focus();
		let { state, dispatch } = this.view;
		let { tr } = state;
		let pos = state.selection.from;
		let result = this.results.slice().reverse().find(result => result.to < pos);
		if (!result) {
			if (this.results.length) {
				result = this.results[this.results.length - 1];
			}
			else {
				return;
			}
		}

		tr.setSelection(TextSelection.between(state.doc.resolve(result.from), state.doc.resolve(result.to)));
		tr.scrollIntoView();
		dispatch(tr);
	}

	next() {
		this.view.dom.focus();
		let { state, dispatch } = this.view;
		let { tr } = state;
		let pos = state.selection.to;
		let result = this.results.find(result => result.from >= pos);
		if (!result) {
			if (this.results.length) {
				result = this.results[0];
			}
			else {
				return;
			}
		}

		tr.setSelection(TextSelection.between(state.doc.resolve(result.from), state.doc.resolve(result.to)));
		tr.scrollIntoView();
		dispatch(tr);
	}

	search(doc) {
		this.results = [];
		const mergedTextNodes = [];
		let index = 0;

		if (!this.searchTerm) {
			return;
		}

		let searchTerm = this.searchTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
		let searchRe = new RegExp(
			this.wholeWords ? `\\b(${searchTerm})\\b` : searchTerm,
			!this.caseSensitive ? 'gui' : 'gu'
		);

		doc.descendants((node, pos) => {
			if (node.isText) {
				if (mergedTextNodes[index]) {
					mergedTextNodes[index] = {
						text: mergedTextNodes[index].text + node.text,
						pos: mergedTextNodes[index].pos
					};
				}
				else {
					mergedTextNodes[index] = {
						text: node.text,
						pos
					};
				}
			}
			else {
				index += 1;
			}
		});

		mergedTextNodes.forEach(({ text, pos }) => {
			searchRe.lastIndex = 0;
			let m;
			while ((m = searchRe.exec(text))) {
				if (m[0] === '') {
					break;
				}

				this.results.push({
					from: pos + m.index,
					to: pos + m.index + m[0].length
				});
			}
		});
	}

	replace(replace) {
		this.view.dom.focus();
		let { state, dispatch } = this.view;
		let from = state.selection.from;
		let to = state.selection.to;
		let result = this.results.find(result => result.from === from && result.to === to);
		if (!result) {
			this.next();
			return;
		}

		let tr = state.tr.insertText(replace, result.from, result.to);
		let rebasedTo = tr.mapping.map(result.to);
		tr.setSelection(TextSelection.between(tr.doc.resolve(rebasedTo), tr.doc.resolve(rebasedTo)));
		dispatch(tr);

		this.next();
	}

	replaceAll(replace) {
		let { state, dispatch } = this.view;
		let tr = state.tr;
		for (let result of this.results) {
			tr.insertText(replace, tr.mapping.map(result.from), tr.mapping.map(result.to));
		}
		dispatch(tr);
	}

	updateDecorations(tr) {
		if (this.active) {
			if (this.needsUpdate || tr.docChanged) {
				this.search(tr.doc);
				let list = this.results.map((deco, index) => (
					Decoration.inline(deco.from, deco.to, { class: this.findClass })
				));
				this.decorations = DecorationSet.create(tr.doc, list);
				this.needsUpdate = false;
			}
		}
		else {
			this.decorations = DecorationSet.empty;
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
				pluginState.updateDecorations(tr);
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = searchKey.getState(view.state);
			pluginState.view = view;
			return {};
		},
		props: {
			decorations(state) {
				return this.getState(state).decorations;
			}
		}
	});
}
