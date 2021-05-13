import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { schema } from '../schema';

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
		if (node) {
			let rect = node.getBoundingClientRect();
			let href = this.getHref(state);
			if (this.view.state.selection.empty && href !== null) {
				this.popup = {
					active: true,
					rect,
					href,
					setURL: this.setURL.bind(this),
					removeURL: this.removeURL.bind(this),
					open: this.open.bind(this)
				};
				return;
			}
		}
		this.popup = { active: false };
	}

	getLinkNode(pos) {
		let node = this.view.domAtPos(pos);
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
		if (this.hasMark(schema.marks.link)(state, dispatch)) {
			this.removeMark(schema.marks.link)(state, dispatch);
		}
		else if (!state.selection.empty) {
			let selection = window.getSelection();
			let range = selection.getRangeAt(0);
			let rect = range.getBoundingClientRect();
			this.popup = {
				active: true,
				rect,
				href: '',
				setURL: this.setURL.bind(this),
				removeURL: this.removeURL.bind(this),
				open: this.open.bind(this)
			};
			dispatch(state.tr);
		}
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
		this.updateMark(schema.marks.link, { href: url })(this.view.state, this.view.dispatch);
	}

	removeURL() {
		this.removeMark(schema.marks.link)(this.view.state, this.view.dispatch);
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

	getMarkRange($pos = null, type = null) {
		if (!$pos || !type) {
			return false;
		}

		const start = $pos.parent.childAfter($pos.parentOffset);

		if (!start.node) {
			return false;
		}

		const link = start.node.marks.find(mark => mark.type === type);
		if (!link) {
			return false;
		}

		let startIndex = $pos.index();
		let startPos = $pos.start() + start.offset;
		let endIndex = startIndex + 1;
		let endPos = startPos + start.node.nodeSize;

		while (startIndex > 0 && link.isInSet($pos.parent.child(startIndex - 1).marks)) {
			startIndex -= 1;
			startPos -= $pos.parent.child(startIndex).nodeSize;
		}

		while (endIndex < $pos.parent.childCount && link.isInSet($pos.parent.child(endIndex).marks)) {
			endPos += $pos.parent.child(endIndex).nodeSize;
			endIndex += 1;
		}

		return { from: startPos, to: endPos };
	}

	updateMark(type, attrs) {
		return (state, dispatch) => {
			const { tr, selection, doc } = state;
			let { from, to } = selection;
			const { $from, empty } = selection;

			if (empty) {
				const range = this.getMarkRange($from, type);

				from = range.from;
				to = range.to;
			}

			const hasMark = doc.rangeHasMark(from, to, type);

			if (hasMark) {
				tr.removeMark(from, to, type);
			}

			tr.addMark(from, to, type.create(attrs));

			return dispatch(tr);
		};
	}

	removeMark(type) {
		return (state, dispatch) => {
			const { tr, selection } = state;
			let { from, to } = selection;
			const { $from, empty } = selection;

			if (empty) {
				const range = this.getMarkRange($from, type);

				from = range.from;
				to = range.to;
			}

			tr.removeMark(from, to, type);

			return dispatch(tr);
		};
	}


	hasMark(type) {
		return (state, dispatch) => {
			const { tr, selection, doc } = state;
			let { from, to } = selection;
			const { $from, empty } = selection;

			if (empty) {
				const range = this.getMarkRange($from, type);

				from = range.from;
				to = range.to;
			}

			return doc.rangeHasMark(from, to, type);
		};
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
