import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { schema } from '../schema';
import { toggleMark } from 'prosemirror-commands';
import { randomString } from '../utils';

function textRange(node, from, to) {
	const range = document.createRange()
	range.setEnd(node, to == null ? node.nodeValue.length : to)
	range.setStart(node, from || 0)
	return range
}

function singleRect(object, bias) {
	const rects = object.getClientRects()
	return !rects.length ? object.getBoundingClientRect() : rects[bias < 0 ? 0 : rects.length - 1]
}

function coordsAtPos(view, pos, end = false) {
	const { node, offset } = view.docView.domFromPos(pos)
	let side
	let rect
	if (node.nodeType === 3) {
		if (end && offset < node.nodeValue.length) {
			rect = singleRect(textRange(node, offset - 1, offset), -1)
			side = 'right'
		}
		else if (offset < node.nodeValue.length) {
			rect = singleRect(textRange(node, offset, offset + 1), -1)
			side = 'left'
		}
	}
	else if (node.firstChild) {
		if (offset < node.childNodes.length) {
			const child = node.childNodes[offset]
			rect = singleRect(child.nodeType === 3 ? textRange(child) : child, -1)
			side = 'left'
		}
		if ((!rect || rect.top === rect.bottom) && offset) {
			const child = node.childNodes[offset - 1]
			rect = singleRect(child.nodeType === 3 ? textRange(child) : child, 1)
			side = 'right'
		}
	}
	else {
		rect = node.getBoundingClientRect()
		side = 'left'
	}

	const x = rect[side]
	return {
		top: rect.top,
		bottom: rect.bottom,
		left: x,
		right: x
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

class Link {
	constructor(state, options) {
		this.popup = {
			isActive: false
		}
		this.onOpenUrl = options.onOpenUrl;
	}

	update(state, oldState) {
		if (!this.view) {
			this.popup = { ...this.popup, isActive: false };
			return;
		}

		this.isActive = this.hasMark(schema.marks.link)(this.view.state, this.view.dispatch);

		if (oldState && oldState.doc.eq(state.doc) && oldState.selection.eq(state.selection)) {
			return
		}

		const { from, to } = state.selection

		// These are in screen coordinates
		// We can't use EditorView.cordsAtPos here because it can't handle linebreaks correctly
		// See: https://github.com/ProseMirror/prosemirror-view/pull/47
		const start = coordsAtPos(this.view, from)
		const end = coordsAtPos(this.view, to, true)

		let isMultiline = start.top !== end.top;
		let left = isMultiline ? start.left : start.left + (end.left - start.left) / 2;
		let href = this.getHref(state);

		let visible = false;
		if (this.view.state.selection.empty && href !== null) {
			visible = true;
		}

		this.popup = {
			isActive: visible,
			left,
			top: start.top,
			bottom: end.bottom,
			href,
			isMultiline,
			pos: from,
			setUrl: this.setUrl.bind(this),
			removeUrl: this.removeUrl.bind(this),
			toggle: this.toggle.bind(this),
			open: this.open.bind(this)
		};
	}

	toggle() {
		let { state, dispatch } = this.view;
		if (this.hasMark(schema.marks.link)(this.view.state, this.view.dispatch)) {
			this.removeMark(schema.marks.link)(this.view.state, this.view.dispatch);
		}
		else {
			if (!state.selection.empty) {
				this.popup = { ...this.popup, isActive: true };
				dispatch(state.tr);
			}
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
					return true;
				});
			}
			else {
				this.onOpenUrl(this.popup.href);
			}
		}
	}

	setUrl(url) {
		this.updateMark(schema.marks.link, { href: url })(this.view.state, this.view.dispatch);
	}

	removeUrl() {
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
			return false
		}

		const start = $pos.parent.childAfter($pos.parentOffset)

		if (!start.node) {
			return false
		}

		const link = start.node.marks.find(mark => mark.type === type)
		if (!link) {
			return false
		}

		let startIndex = $pos.index()
		let startPos = $pos.start() + start.offset
		let endIndex = startIndex + 1
		let endPos = startPos + start.node.nodeSize

		while (startIndex > 0 && link.isInSet($pos.parent.child(startIndex - 1).marks)) {
			startIndex -= 1
			startPos -= $pos.parent.child(startIndex).nodeSize
		}

		while (endIndex < $pos.parent.childCount && link.isInSet($pos.parent.child(endIndex).marks)) {
			endPos += $pos.parent.child(endIndex).nodeSize
			endIndex += 1
		}

		return { from: startPos, to: endPos }

	}

	updateMark(type, attrs) {
		return (state, dispatch) => {
			const { tr, selection, doc } = state
			let { from, to } = selection
			const { $from, empty } = selection

			if (empty) {
				const range = this.getMarkRange($from, type)

				from = range.from
				to = range.to
			}

			const hasMark = doc.rangeHasMark(from, to, type)

			if (hasMark) {
				tr.removeMark(from, to, type)
			}

			tr.addMark(from, to, type.create(attrs))

			return dispatch(tr)
		}
	}

	removeMark(type) {
		return (state, dispatch) => {
			const { tr, selection } = state
			let { from, to } = selection
			const { $from, empty } = selection

			if (empty) {
				const range = this.getMarkRange($from, type)

				from = range.from
				to = range.to
			}

			tr.removeMark(from, to, type)

			return dispatch(tr)
		}
	}


	hasMark(type) {
		return (state, dispatch) => {
			const { tr, selection, doc } = state
			let { from, to } = selection
			const { $from, empty } = selection

			if (empty) {
				const range = this.getMarkRange($from, type)

				from = range.from
				to = range.to
			}

			return doc.rangeHasMark(from, to, type)
		}
	}

	destroy() {
		this.popup = { ...this.popup, isActive: false };
	}
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
							options.onOpenUrl(href);
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
			}
		}
	});
}
