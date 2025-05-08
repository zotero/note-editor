import {
	wrapIn, setBlockType, chainCommands, toggleMark, exitCode,
	joinUp, joinDown, lift, newlineInCode, liftEmptyBlock, createParagraphNear
} from 'prosemirror-commands';
import { wrapInList, splitListItem } from 'prosemirror-schema-list';
import { undo, redo } from 'prosemirror-history';
import { undoInputRule } from 'prosemirror-inputrules';
import { schema } from './schema';
import { changeIndent, removeBlockIndent, customSplitBlock } from './commands';

const mac = typeof navigator != 'undefined' ? /Mac/.test(navigator.platform) : false;

export function buildKeymap(options) {
	let keys = {};

	function bind(key, cmd) {
		keys[key] = cmd;
	}

	bind('Mod-z', customUndo);
	bind('Shift-Mod-z', redo);
	bind('Backspace', undoInputRule);
	bind('Backspace', removeBlockIndent());
	if (!mac) bind('Mod-y', redo);

	bind('Alt-F10', focusToolbar);
	bind('Alt-ArrowUp', joinUp);
	bind('Alt-ArrowDown', joinDown);
	bind('Mod-BracketLeft', lift);

	bind('Mod-b', toggleMark(schema.marks.strong));
	bind('Mod-B', toggleMark(schema.marks.strong));

	bind('Mod-i', toggleMark(schema.marks.em));
	bind('Mod-I', toggleMark(schema.marks.em));

	bind('Mod-u', toggleMark(schema.marks.underline));
	bind('Mod-U', toggleMark(schema.marks.underline));

	bind('Mod-`', toggleMark(schema.marks.code));

	bind('Mod-k', options.toggleLink);
	bind('Mod-K', options.toggleLink);

	if (mac) {
		bind('Cmd-Ctrl-c', options.insertCitation);
		bind('Cmd-Ctrl-C', options.insertCitation);
	}
	else {
		bind('Ctrl-Alt-c', options.insertCitation);
		bind('Ctrl-Alt-C', options.insertCitation);
	}

	bind('Shift-Ctrl-8', wrapInList(schema.nodes.bulletList));
	bind('Shift-Ctrl-9', wrapInList(schema.nodes.orderedList));
	bind('Ctrl->', wrapIn(schema.nodes.blockquote));

	// Hard break
	let cmd = chainCommands(exitCode, (state, dispatch) => {
		// except if the cursor is on a link - then just open it
		if (options.openLink) {
			options.openLink();
			return true;
		}
		dispatch(state.tr.replaceSelectionWith(schema.nodes.hardBreak.create()).scrollIntoView());
		return true;
	});
	bind('Mod-Enter', cmd);
	bind('Shift-Enter', cmd);
	if (mac) bind('Ctrl-Enter', cmd);

	bind('Shift-Tab', chainCommands(
		options.goToPreviousCell,
		changeIndent(-1, true)
	));
	bind('Tab', chainCommands(
		options.goToNextCell,
		changeIndent(1, true)
	));

	bind('Shift-Ctrl-0', setBlockType(schema.nodes.paragraph));
	bind('Shift-Ctrl-\\', setBlockType(schema.nodes.codeBlock));

	// Heading
	for (let i = 1; i <= 6; i++) {
		bind('Shift-Ctrl-' + i, setBlockType(schema.nodes.heading, { level: i }));
	}

	// Horizontal rule
	bind('Mod-_', (state, dispatch) => {
		dispatch(state.tr.replaceSelectionWith(schema.nodes.horizontalRule.create()).scrollIntoView());
		return true;
	});

	bind('Enter', chainCommands(
		splitListItem(schema.nodes.listItem),
		newlineInCode,
		createParagraphNear,
		liftEmptyBlock,
		customSplitBlock
	),);

	return keys;
}

function customUndo(state, dispatch) {
  if(undoInputRule(state, dispatch)) {
    return true;
  } else {
    return undo(state, dispatch);
  }
}

function focusToolbar() {
	document.querySelector('.toolbar button').focus();
}

window.addEventListener('keydown', function(event) {
	if (event.key === 'Escape') {
		document.querySelector('.primary-editor').focus();
		// TODO: Close findbar
	}
});
