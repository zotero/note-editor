import { Plugin, PluginKey } from 'prosemirror-state';


import { toggleMark, setBlockType, wrapIn, lift } from 'prosemirror-commands';
import { wrapInList } from 'prosemirror-schema-list';

import * as commands from '../commands';
import { schema } from '../schema';

import { TextSelection, NodeSelection } from 'prosemirror-state';
import nodeIsActive, { getActiveColor, randomString } from '../utils';
import { NodeRange } from 'prosemirror-model';
import { findWrapping, liftTarget } from 'prosemirror-transform';


let markActive3 = type => (state) => {
	let { from, $from, to, empty } = state.selection;
	if (empty) return type.isInSet(state.storedMarks || $from.marks());
	else return state.doc.rangeHasMark(from, to, type);
};

const blockActive = (type, attrs = {}) => (state) => {
	const { $from, to, node } = state.selection;

	if (node) {
		return node.hasMarkup(type, attrs);
	}

	return to <= $from.end() && $from.parent.hasMarkup(type, attrs);
};


function hasMarkup(node, type, attrs) {
	return node.type === type && (!attrs || Object.keys(attrs).every(key => attrs[key] === node.attrs[key]));
}

function clear() {
  return function (state, dispatch) {
    let { tr } = state;
    let marks = ['strong', 'em', 'underline', 'strike', 'textColor', 'backgroundColor', 'code', 'subsup'];
    let nodes = ['heading'];

    marks.forEach(mark => {
      let { from, to } = tr.selection;
      if (state.schema.marks[mark]) {
        tr.removeMark(from, to, state.schema.marks[mark]);
      }
    });

    nodes.forEach(nodeName => {
      let formattedNodeType = state.schema.nodes[nodeName];
      let { $from, $to } = tr.selection;
      tr.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
        if (node.type === formattedNodeType) {
	        tr.setNodeMarkup(pos, state.schema.nodes.paragraph);
          return false;
        }
        return true;
      });
    });

    tr.setStoredMarks([]);
    dispatch(tr);
    return true;
  };
}

class Menu {
	constructor(state) {
		this.update(state);
	}

	buildToggle(type, attrs) {
		return {
			isActive: markActive3(type.create(attrs))(this.state),
			run: () => {
				this.view.focus();
				commands.toggleMark(type, attrs)(this.view.state)(this.view.state, this.view.dispatch);
			}
		};
	}

	buildBlock(nodeType, attrs, setInactive) {
		let command = setBlockType(nodeType, attrs);
		let isActive;

		const { $from, to, node } = this.state.selection;

		if (node) {
			isActive = hasMarkup(node, nodeType, attrs);
		}
		else {
			isActive = to <= $from.end() && hasMarkup($from.parent, nodeType, attrs);
		}

		return {
			isActive: isActive && !setInactive,
			run: () => {
				this.view.focus();
				if (isActive) {
					command = setBlockType(schema.nodes.paragraph, attrs);
				}
				command(this.view.state, this.view.dispatch);
			}
		};
	}

	isBlockquoteActive(state) {
		let { selection } = state;
		let $from = selection.$from;
		let $to = selection.$to;
		let topNode  = $from.node(1);
		let active = true;
		let n = 0;
		state.doc.nodesBetween($from.before(1), $to.after(1), (parentNode, parentPos) => {
			let node = state.doc.nodeAt(parentPos);
			if (node.type !== schema.nodes.blockquote) {
				active = false;
			}
			n++;
			return false;
		});
		return active;
	}

	toggleBlockquote(state, dispatch) {
		let { selection } = state;
		let $from = selection.$from;
		let $to = selection.$to;
		if (this.isBlockquoteActive(state)) {
			let $a = state.doc.resolve($from.start(1));
			let $b = state.doc.resolve($to.end(1));
			let range = $a.blockRange($b);
			let target = range && liftTarget(range);
			if (target === null) {
				return false;
			}
			dispatch(state.tr.lift(range, target));
		}
		else {
			if (state.selection.empty) {
				let $a = state.doc.resolve($from.before(1));
				let $b = state.doc.resolve($to.after(1));
				let range = $a.blockRange($b);
				let wrapping = range && findWrapping(range, schema.nodes.blockquote, {  });
				if (!wrapping) {
					return false
				}
				dispatch(state.tr.wrap(range, wrapping).scrollIntoView());
			}
			else {
				wrapIn(schema.nodes.blockquote)(state, dispatch);
			}
		}
	}

	isListActive(state, type) {
		let { selection } = state;
		let $from = selection.$from;
		let $to = selection.$to;

		let depth = $from.depth;
		while (depth > 0) {
			let node = $from.node(depth);
			if (node.type === type) {
				return true;
			}

			if ([schema.nodes.bulletList, schema.nodes.orderedList].includes(node.type)) {
				return false;
			}
			depth--;
		}

		return false;
}

	update(newState) {
		let dispatch;
		if (this.view) {
			dispatch = this.view.dispatch;
		}

		let focus = () => {
			if (this.view) {
				this.view.focus();
			}
		}

		let state = newState;
		this.state = newState;
		this.strong = this.buildToggle(schema.marks.strong);
		this.em = this.buildToggle(schema.marks.em);
		this.strike = this.buildToggle(schema.marks.strike);
		this.underline = this.buildToggle(schema.marks.underline);
		this.subscript = this.buildToggle(schema.marks.subsup, { type: 'sub' });
		this.superscript = this.buildToggle(schema.marks.subsup, { type: 'sup' });
		this.code = this.buildToggle(schema.marks.code);

		this.textColor = {
			color: getActiveColor(state),
			run: (color) => {
				focus();
				commands.toggleMark(schema.marks.textColor, { color })(this.view.state)(this.view.state, this.view.dispatch);
			}
		};

		this.clearFormatting = {
			isActive: false,
			run() {
				focus();
				clear()(state, dispatch);
			}
		};

		this.math_display = {
			isActive: false,
			run() {
				let { $from } = state.selection;
				let mathNode = schema.nodes.math_display.create();
				let tr = state.tr.replaceSelectionWith(mathNode);
				tr = tr.setSelection(NodeSelection.create(tr.doc, $from.pos-1));
				dispatch(tr);
			}
		}

		let insideList = nodeIsActive(state, schema.nodes.orderedList) || nodeIsActive(state, schema.nodes.bulletList);
		let insideBlockquote = nodeIsActive(state, schema.nodes.blockquote);
		this.paragraph = this.buildBlock(schema.nodes.paragraph, {}, insideList || insideBlockquote);
		this.codeBlock = this.buildBlock(schema.nodes.codeBlock);
		this.heading1 = this.buildBlock(schema.nodes.heading, { level: 1 });
		this.heading2 = this.buildBlock(schema.nodes.heading, { level: 2 });
		this.heading3 = this.buildBlock(schema.nodes.heading, { level: 3 });

		this.bulletList = {
			isActive: this.isListActive(state, schema.nodes.bulletList),
			run: () => {
				focus();
				commands.toggleList(schema.nodes.bulletList, schema.nodes.listItem)(state, dispatch, this.view);
			}
		};

		this.orderedList = {
			isActive: this.isListActive(state, schema.nodes.orderedList),
			run: () => {
				focus();
				commands.toggleList(schema.nodes.orderedList, schema.nodes.listItem)(state, dispatch, this.view);
			}
		};

		this.blockquote = {
			isActive: this.isBlockquoteActive(state),
			run: () => {
				focus();
				return this.toggleBlockquote(state, dispatch);
			}
		}

		this.alignLeft = {
			isActive: commands.hasAttr(state, 'align', 'left'),
			run() {
				focus();
				commands.toggleAlignment('left')(state, dispatch);
			}
		};

		this.alignCenter = {
			isActive: commands.hasAttr(state, 'align', 'center'),
			run() {
				focus();
				commands.toggleAlignment('center')(state, dispatch);
			}
		};

		this.alignRight = {
			isActive: commands.hasAttr(state, 'align', 'right'),
			run() {
				focus();
				commands.toggleAlignment('right')(state, dispatch);
			}
		};

		this.indent = {
			isActive: false,
			run() {
				focus();
				commands.changeIndent(1)(state, dispatch);
			}
		};

		this.outdent = {
			isActive: false,
			run() {
				focus();
				commands.changeIndent(-1)(state, dispatch);
			}
		};

		this.ltr = {
			isActive: commands.hasAttr(state, 'dir', 'ltr'),
			run() {
				focus();
				commands.toggleDir('ltr')(state, dispatch);
			}
		};

		this.rtl = {
			isActive: commands.hasAttr(state, 'dir', 'rtl'),
			run() {
				focus();
				commands.toggleDir('rtl')(state, dispatch);
			}
		};
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
			return {};
		}
	});
}
