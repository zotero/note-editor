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
		this.debounceTimer = null;
		this.scrollTimer = null;
		// Debounce delays for search updates in ms
		this.updateDebounceDelay = 300;
		this.selectionDebounceDelay = 10;
		// Debounce delay for scroll updates in ms
		this.scrollDebounceDelay = 100;
		// Height buffer for range of decorations beyond viewport in px
		this.decorationBuffer = 500;
		// Maximum number of decorations to render at once
		this.maxDecorations = 500;
		this.handleScroll = this._handleScroll.bind(this);
		this.scrollListenerAttached = false;
		this.scrollContainer = null;
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

		this.triggerDecorations = true;
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

		this.triggerDecorations = true;
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
		let chars = removeDiacritics(searchTerm);
		searchTerm = chars.reduce((str, char) => str + char[1], '');
		let searchRe = new RegExp(
			this.wholeWords ? `\\b(${searchTerm})\\b` : searchTerm,
			!this.caseSensitive ? 'gui' : 'gu'
		);

		doc.descendants((node, pos) => {
			if (node.isText) {
				let chars = removeDiacritics(node.text);
				if (mergedTextNodes[index]) {
					let currentTextNode = mergedTextNodes[index];
					let shift = currentTextNode.textLength;
					for (let i = 0; i < chars.length; i++) {
						chars[i][0] += shift;
						currentTextNode.chars.push(chars[i]);
					}
					currentTextNode.textLength += node.text.length;
				}
				else {
					mergedTextNodes[index] = { chars, pos, textLength: node.text.length };
				}
			}
			else {
				index += 1;
				if (node.type === schema.nodes.citation) {
					let res = this.view.domAtPos(pos);
					if (res) {
						let text = res.node.childNodes[res.offset].innerText;
						let chars = removeDiacritics(text);
						mergedTextNodes[index++] = { chars, pos, isCitation: true };
					}
				}
			}
		});

		mergedTextNodes.forEach(({ chars, pos, isCitation }) => {
			let text = chars.reduce((str, char) => str + char[1], '');
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
						from: pos + chars[m.index][0],
						to: pos + chars[m.index + m[0].length - 1][0] + 1
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
			else if (tr.selectionSet && this.results.length) {
				// Update selectedResultIndex based on current selection
				let pos = tr.selection.from;
				let index = this.results.findIndex(r => r.from <= pos && r.to >= pos);
				if (index === -1) {
					index = this.results.findIndex(r => r.from > pos);
					if (index === -1) index = 0;
				}
				if (index !== this.selectedResultIndex) {
					this.selectedResultIndex = index;
					this.triggerDecorations = true;
				}
			}
		}
		else {
			this.decorations = DecorationSet.empty;
		}
	}

	updateView() {
		if (!this.active || !this.searchTerm) {
			// If search is not active, clear decorations
			if (!this.active && this.decorations !== DecorationSet.empty) {
				this.decorations = DecorationSet.empty;
				let { state, dispatch } = this.view;
				dispatch(state.tr);
			}
			return;
		}

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		this.debounceTimer = setTimeout(() => {
			if (this.triggerUpdate) {
				this.triggerUpdate = false;
				this.triggerDecorations = false;

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
				
				this.updateDecorations(tr.doc);

				dispatch(tr.setMeta('addToHistory', false));
			}
			else if (this.triggerDecorations) {
				this.triggerDecorations = false;
				this.updateDecorations(this.view.state.doc);
				this.view.dispatch(this.view.state.tr.setMeta('addToHistory', false));
			}
		}, this.triggerUpdate ? this.updateDebounceDelay : this.selectionDebounceDelay);
	}

	updateScrollListener() {
		if (this.active && !this.scrollListenerAttached) {
			let container = this.view.dom.closest('.editor-core') || this.view.dom.parentElement;
			if (container) {
				container.addEventListener('scroll', this._handleScroll);
				this.scrollListenerAttached = true;
				this.scrollContainer = container;
			}
		}
		else if (!this.active && this.scrollListenerAttached) {
			if (this.scrollContainer) {
				this.scrollContainer.removeEventListener('scroll', this._handleScroll);
			}
			this.scrollListenerAttached = false;
			this.scrollContainer = null;
		}
	}

	_handleScroll() {
		if (!this.active || !this.results.length) return;

		if (this.scrollTimer) clearTimeout(this.scrollTimer);
		this.scrollTimer = setTimeout(() => {
			this.updateDecorations(this.view.state.doc);
			this.view.dispatch(this.view.state.tr.setMeta('addToHistory', false));
		}, this.scrollDebounceDelay);
	}

	updateDecorations(doc) {
		let { view } = this;
		if (!view) return;

		let visibleFrom = 0;
		let visibleTo = doc.content.size;

		let container = view.dom.closest('.editor-core') || view.dom.parentElement;
		if (container) {
			let rect = container.getBoundingClientRect();
			let editorRect = view.dom.getBoundingClientRect();
			let left = editorRect.left + (editorRect.width / 2);

			// Extend decoration range beyond viewport for smoother scrolling
			let startObj = view.posAtCoords({ left, top: rect.top - this.decorationBuffer });
			let endObj = view.posAtCoords({ left, top: rect.bottom + this.decorationBuffer });

			if (startObj) visibleFrom = startObj.pos;
			if (endObj) visibleTo = endObj.pos;
		}

		let list = [];

		// Always render selected result
		if (this.results[this.selectedResultIndex]) {
			let res = this.results[this.selectedResultIndex];
			list.push(Decoration.inline(res.from, res.to, { class: this.findSelectedClass }));
		}

		// Render decorations within visible range
		let startIndex = this.results.findIndex(r => r.to >= visibleFrom);
		if (startIndex === -1) startIndex = this.results.length;

		for (let i = startIndex; i < this.results.length; i++) {
			let res = this.results[i];
			if (res.from > visibleTo) break;

			if (i === this.selectedResultIndex) continue;

			list.push(Decoration.inline(res.from, res.to, { class: this.findClass }));

			if (list.length > this.maxDecorations) break;
		}

		this.decorations = DecorationSet.create(doc, list);
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
			pluginState.updateScrollListener();

			return {
				update(view, lastState) {
					let pluginState = searchKey.getState(view.state);
					pluginState.updateView(view.state, lastState);
					pluginState.updateScrollListener();
				},
				destroy() {
					if (pluginState.scrollListenerAttached && pluginState.scrollContainer) {
						pluginState.scrollContainer.removeEventListener('scroll', pluginState.onScroll);
					}
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
