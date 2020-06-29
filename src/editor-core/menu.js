import {
  wrapItem, blockTypeItem, Dropdown, DropdownSubmenu, joinUpItem, liftItem,
  undoItem, redoItem, MenuItem
} from 'prosemirror-menu'
import { NodeSelection } from 'prosemirror-state'
import { toggleMark, lift, setBlockType, wrapIn } from 'prosemirror-commands'
import { wrapInList, liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list'

import * as commands from './commands'
import { schema } from './schema'

import { TextSelection } from 'prosemirror-state'


import { getActiveColor } from './utils';

import ss from './fr'

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

function buildToggle(title, type) {
  return {
    title,
    active: markActive3(type),
    run: toggleMark(type)
  }
}


function hasMarkup(node, type, attrs) {
  return node.type === type && (!attrs || Object.keys(attrs).every(key => attrs[key] === node.attrs[key]));
}

// :: (NodeType, Object) → MenuItem
// Build a menu item for changing the type of the textblock around the
// selection to the given type. Provides `run`, `active`, and `select`
// properties. Others must be given in `options`. `options.attrs` may
// be an object to provide the attributes for the textblock node.
function buildBlock(title, label, nodeType, attrs) {
  var command = setBlockType(nodeType, attrs);
  return {
    title,
    label,
    run: command,
    enable: function enable(state) {
      return command(state)
    },
    active: function active(state) {
      const { $from, to, node } = state.selection

      if (node) {
        return hasMarkup(node, nodeType, attrs)
      }
      // console.log('buildBlock', $from.parent, label, hasMarkup($from.parent, nodeType, attrs))
      return to <= $from.end() && hasMarkup($from.parent, nodeType, attrs)
    }
  }
}

export default {
  strong: buildToggle('Toggle strong style', schema.marks.strong),
  em: buildToggle('Toggle emphasis', schema.marks.em),
  strikethrough: buildToggle('Toggle strikethrough', schema.marks.strikethrough),
  underline: buildToggle('Toggle underline', schema.marks.underline),
  subscript: buildToggle('Toggle subscript', schema.marks.subscript),
  superscript: buildToggle('Toggle superscript', schema.marks.superscript),
  textColor: {
    title: 'Text color',
    activeColor(state) {
      return getActiveColor(state);
    },
    run(state, dispatch, view, color) {
      commands.toggleMark1(schema.marks.textColor, { textColor: color }, true)(state, dispatch);
    }
  },
  backgroundColor: {
    title: 'Background color',
    activeColor(state) {
      return getActiveColor(state);
    },
    run(state, dispatch, view, color) {
      commands.toggleMark1(schema.marks.backgroundColor, { backgroundColor: color }, true)(state, dispatch);
    }
  },
  clearFormatting: {
    title: 'Clear formatting',
    active(state) {
      return false;
    },
    enable(state) {
      return true;
    },
    run(state, dispatch, view) {
      dispatch(state.tr.removeMark(state.selection.from, state.selection.to).setStoredMarks([]));
    }
  },
  blocks: {
    paragraph: buildBlock('Change to paragraph', 'Plain', schema.nodes.paragraph),
    code: buildBlock('Change to code block', 'Code', schema.nodes.code_block),
    heading1: buildBlock('Change to heading 1', 'Level 1', schema.nodes.heading, { level: 1 }),
    heading2: buildBlock('Change to heading 2', 'Level 2', schema.nodes.heading, { level: 2 }),
    heading3: buildBlock('Change to heading 3', 'Level 3', schema.nodes.heading, { level: 3 }),
    heading4: buildBlock('Change to heading 4', 'Level 4', schema.nodes.heading, { level: 4 }),
    heading5: buildBlock('Change to heading 5', 'Level 5', schema.nodes.heading, { level: 5 }),
    heading6: buildBlock('Change to heading 6', 'Level 6', schema.nodes.heading, { level: 6 })
  },
  alignLeft: {
    title: 'Align left',
    active(state) {
      return commands.hasAttr(state, 'align', 'left')
    },
    enable(state) {
      return true;
    },
    run(state, dispatch, view) {
      commands.toggleAlignment('left')(state, dispatch)
    }
  },
  alignCenter: {
    title: 'Align center',
    active(state) {
      return commands.hasAttr(state, 'align', 'center')
    },
    enable(state) {
      return true;
    },
    run(state, dispatch, view) {
      commands.toggleAlignment('center')(state, dispatch)
    }
  },
  alignRight: {
    title: 'Align right',
    active(state) {
      return commands.hasAttr(state, 'align', 'right')
    },
    enable(state) {
      return true;
    },
    run(state, dispatch, view) {
      commands.toggleAlignment('right')(state, dispatch)
    }
  },
  alignJustify: {
    title: 'Align justify',
    active(state) {
      return commands.hasAttr(state, 'align', 'right')
    },
    enable(state) {
      return true;
    },
    run(state, dispatch, view) {
      commands.toggleAlignment('justify')(state, dispatch)
    }
  },
  blockquote: {
    title: 'Wrap in block quote',
    active: blockActive(schema.marks.blockquote),
    run: function run(state, dispatch) {
      return wrapIn(schema.nodes.blockquote)(state, dispatch);
    }
  },
  link: {
    title: 'Add or remove link',
    active: markActive3(schema.marks.link),
    enable(state) {
      return !state.selection.empty
    },
    run(state, dispatch, view) {

      if (markActive3(schema.marks.link)(state)) {
        toggleMark(schema.marks.link)(state, dispatch);
      }
      else {
        window.ooo = true;
        dispatch(state.tr.setSelection(new TextSelection(state.selection.$from, state.selection.$to)));
      }
    }
  },
  bulletList: {
    title: 'Wrap in bullet list',
    active(state) {
      return false
    },
    enable() {
      return true;
    },
    run: wrapInList(schema.nodes.bullet_list)
  },
  orderedList: {
    title: 'Wrap in ordered list',
    active(state) {
      return false
    },
    enable() {
      return true;
    },
    run: wrapInList(schema.nodes.ordered_list)
  },
  indent: {
    title: 'Indent',
    active(state) {
      return false
    },
    enable() {
      return true;
    },
    run: commands.changeIndent(1)
  },
  outdent: {
    title: 'Outdent',
    active(state) {
      return false
    },
    enable() {
      return true;
    },
    run: commands.changeIndent(-1)
  }
};
