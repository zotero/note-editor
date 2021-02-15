import { Plugin, PluginKey } from 'prosemirror-state';


import { toggleMark, setBlockType, wrapIn } from 'prosemirror-commands'
import { wrapInList } from 'prosemirror-schema-list'

import * as commands from '../commands'
import { schema } from '../schema'

import { TextSelection } from 'prosemirror-state'
import nodeIsActive, { getActiveColor } from '../utils';


let markActive3 = type => state => {
	let { from, $from, to, empty } = state.selection
	if (empty) return type.isInSet(state.storedMarks || $from.marks())
	else return state.doc.rangeHasMark(from, to, type)
}

const blockActive = (type, attrs = {}) => state => {
	const { $from, to, node } = state.selection

	if (node) {
		return node.hasMarkup(type, attrs)
	}

	return to <= $from.end() && $from.parent.hasMarkup(type, attrs)
}


function hasMarkup(node, type, attrs) {
	return node.type === type && (!attrs || Object.keys(attrs).every(key => attrs[key] === node.attrs[key]));
}


class Menu {
	constructor(state) {
		this.update(state)
	}

	buildToggle(type, attrs) {
		return {
			isActive: markActive3(type.create(attrs))(this.state),
			run: () => {
				toggleMark(type, attrs)(this.view.state, this.view.dispatch)
			}
		}
	}

	buildBlock(nodeType, attrs) {
		let command = setBlockType(nodeType, attrs);
		let isActive;

		const { $from, to, node } = this.state.selection

		if (node) {
			isActive = hasMarkup(node, nodeType, attrs)
		}
		else {
			isActive = to <= $from.end() && hasMarkup($from.parent, nodeType, attrs);
		}

		return {
			isActive,
			run: () => {
				command(this.view.state, this.view.dispatch)
			}
		}
	}

	update(newState) {
		let dispatch;
		if (this.view) {
			dispatch = this.view.dispatch;
		}

		let state = newState;
		this.state = newState;
		this.strong = this.buildToggle(schema.marks.strong);
		this.em = this.buildToggle(schema.marks.em)
		this.strike = this.buildToggle(schema.marks.strike)
		this.underline = this.buildToggle(schema.marks.underline)
		this.subscript = this.buildToggle(schema.marks.subsup, { type: 'sub' })
		this.superscript = this.buildToggle(schema.marks.subsup, { type: 'sup' })

		this.textColor = {
			color: getActiveColor(state),
			run(color) {
				commands.toggleMark1(schema.marks.textColor, { color }, true)(state, dispatch);
			}
		};

		this.backgroundColor = {
			color: getActiveColor(state),
			run(color) {
				commands.toggleMark1(schema.marks.backgroundColor, { color }, true)(state, dispatch);
			}
		}

		this.clearFormatting = {
			isActive: false,
			run() {
				dispatch(state.tr.removeMark(state.selection.from, state.selection.to).setStoredMarks([]));
			}
		}

		this.blocks = {
			paragraph: this.buildBlock(schema.nodes.paragraph),
			code: this.buildBlock(schema.nodes.codeBlock),
			heading1: this.buildBlock(schema.nodes.heading, { level: 1 }),
			heading2: this.buildBlock(schema.nodes.heading, { level: 2 }),
			heading3: this.buildBlock(schema.nodes.heading, { level: 3 }),
			heading4: this.buildBlock(schema.nodes.heading, { level: 4 }),
			heading5: this.buildBlock(schema.nodes.heading, { level: 5 }),
			heading6: this.buildBlock(schema.nodes.heading, { level: 6 })
		}

		this.alignLeft = {
			isActive: commands.hasAttr(state, 'align', 'left'),
			run() {
				commands.toggleAlignment('left')(state, dispatch)
			}
		}

		this.alignCenter = {
			isActive: commands.hasAttr(state, 'align', 'center'),
			run() {
				commands.toggleAlignment('center')(state, dispatch)
			}
		}

		this.alignRight = {
			isActive: commands.hasAttr(state, 'align', 'right'),
			run() {
				commands.toggleAlignment('right')(state, dispatch)
			}
		}

		this.blockquote = {
			isActive: blockActive(schema.marks.blockquote)(state),
			run() {
				return wrapIn(schema.nodes.blockquote)(state, dispatch);
			}
		}

		this.bulletList = {
			isActive: nodeIsActive(state, schema.nodes.bulletList),
			run() {
				commands.toggleList(schema.nodes.bulletList, schema.nodes.listItem)(state, dispatch);
			}
		}

		this.orderedList = {
			isActive: nodeIsActive(state, schema.nodes.orderedList),
			run() {
				commands.toggleList(schema.nodes.orderedList, schema.nodes.listItem)(state, dispatch);
			}
		}

		this.indent = {
			isActive: false,
			run() {
				commands.changeIndent(1)(state, dispatch)
			}
		}

		this.outdent = {
			isActive: false,
			run() {
				commands.changeIndent(-1)(state, dispatch)
			}
		}

		this.ltr = {
			isActive: commands.hasAttr(state, 'dir', 'ltr'),
			run() {
				commands.toggleDir('ltr')(state, dispatch)
			}
		}

		this.rtl = {
			isActive: commands.hasAttr(state, 'dir', 'rtl'),
			run() {
				commands.toggleDir('rtl')(state, dispatch)
			}
		}
	}
}

export let menuKey = new PluginKey('menu');

export function menu() {
	return new Plugin({
		key: menuKey,
		state: {
			init(config, state) {
				return new Menu(state);
			},
			apply(tr, pluginState, oldState, newState) {
				pluginState.update(newState);
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = menuKey.getState(view.state);
			pluginState.view = view;
			return {}
		}
	});
}
