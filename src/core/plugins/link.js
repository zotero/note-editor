import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { schema } from '../schema';
import { removeMarkRangeAtCursor, updateMarkRangeAtCursor } from '../commands';
import { getMarkRangeAtCursor } from '../helpers';
import { refocusEditor } from '../utils';

class Link {
	constructor(state, options) {
		this.popup = { active: false };
		this.options = options;
	}

	update(state, oldState) {
		if (!this.view) {
			return;
		}

		if (oldState && oldState.doc.eq(state.doc) && oldState.selection.eq(state.selection)) {
			return;
		}

		let node = this.getLinkNode(state.selection.from);
		let node2 = this.getLinkNode(state.selection.to - 1);
		if (node) {
			let href = this.getHref(state);
			if ((this.view.state.selection.empty || node === node2) && href !== null) {
				this.popup = {
					active: true,
					node,
					href,
					setURL: this.setURL.bind(this),
					removeURL: this.removeURL.bind(this),
					open: this.open.bind(this),
					cancel: this.cancel.bind(this),
					refocusView: this.refocusView.bind(this),
				};
				return;
			}
		}
		this.popup = { active: false };
	}

	getLinkNode(pos) {
		let node = this.view.domAtPos(pos, 1);
		node = node.node;
		do {
			if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'A') {
				return node;
			}
			else if (node === this.view.dom) {
				return;
			}
		}
		while ((node = node.parentNode));
	}

	toggle() {
		let { state, dispatch } = this.view;
		let href = this.getHref(state);
		let node = this.getLinkNode(state.selection.from);
		if (node || !state.selection.empty) {
			this.popup = {
				active: true,
				href: href,
				setURL: this.setURL.bind(this),
				removeURL: this.removeURL.bind(this),
				open: this.open.bind(this),
				cancel: this.cancel.bind(this),
				refocusView: this.refocusView.bind(this),
				edit: true
			};
			if (node) {
				this.popup.node = node;
			}
			else {
				let selection = window.getSelection();
				let range = selection.getRangeAt(0);
				this.popup.rect = range.getBoundingClientRect();
			}
			dispatch(state.tr);
		}
		this.view.focus();
	}

	open() {
		if (this.popup.href) {
			if (this.popup.href[0] === '#') {
				let { state, dispatch } = this.view;
				state.doc.descendants((node, pos) => {
					if (node.type.name === 'heading' && node.attrs.id === this.popup.href.slice(1)) {
						let { tr } = state;
						tr.setSelection(TextSelection.between(state.doc.resolve(pos), state.doc.resolve(pos)));
						tr.scrollIntoView();
						dispatch(tr);
						return false;
					}
				});
			}
			else {
				this.options.onOpenURL(this.popup.href);
			}
		}
	}

	setURL(url) {
		let from = this.view.state.selection.from;
		let to = this.view.state.selection.to;
		if (!url) {
			return this.removeURL();
		}
		updateMarkRangeAtCursor(schema.marks.link, { href: url })(this.view.state, this.view.dispatch);
		refocusEditor(() => {
			this.view.dispatch(this.view.state.tr.setSelection(TextSelection.create(this.view.state.tr.doc, from, to)));
		});
	}

	removeURL() {
		let from = this.view.state.selection.from;
		let to = this.view.state.selection.to;
		removeMarkRangeAtCursor(schema.marks.link)(this.view.state, this.view.dispatch);
		refocusEditor(() => {
			this.view.dispatch(this.view.state.tr.setSelection(TextSelection.create(this.view.state.tr.doc, from, to)));
		});
	}

	cancel() {
		this.popup = { active: false };
		let { state, dispatch } = this.view;
		dispatch(state.tr);
	}

	refocusView() {
		this.view.focus();
	}

	getHref(state) {
		let $pos = state.selection.$from;
		let start = $pos.parent.childAfter($pos.parentOffset);
		if (start.node) {
			let mark = start.node.marks.find(mark => mark.type.name === 'link');
			if (mark) {
				return mark.attrs.href;
			}
		}
		return null;
	}

	destroy() {
		this.popup = { active: false };
	}
}

function getHrefAtPos($pos) {
	let start = $pos.parent.childAfter($pos.parentOffset);
	if (start.node) {
		let mark = start.node.marks.find(mark => mark.type.name === 'link');
		if (mark) {
			return mark.attrs.href;
		}
	}
	return null;
}

export let linkKey = new PluginKey('link');

export function link(options) {
	return new Plugin({
		key: linkKey,
		props: {
			handleClick: (view, pos, event) => {
				if (event.button === 0 && (event.ctrlKey || event.metaKey)) {
					let href = getHrefAtPos(view.state.doc.resolve(pos));
					if (href) {
						if (href[0] === '#') {
							let { state, dispatch } = view;
							state.doc.descendants((node, pos) => {
								if (node.type.name === 'heading' && node.attrs.id === href.slice(1)) {
									let { tr } = state;
									tr.setSelection(TextSelection.between(state.doc.resolve(pos), state.doc.resolve(pos)));
									tr.scrollIntoView();
									dispatch(tr);
									return false;
								}
								return true;
							});
						}
						else {
							options.onOpenURL(href);
						}
					}
				}
			}
		},
		state: {
			init(config, state) {
				return new Link(state, options);
			},
			apply(tr, pluginState, oldState, newState) {
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = linkKey.getState(view.state);
			pluginState.view = view;
			return {
				update(view, lastState) {
					pluginState.update(view.state, lastState);
				},
				destroy() {
					pluginState.destroy();
				}
			};
		}
	});
}
