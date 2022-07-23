import { InputRule } from 'prosemirror-inputrules';
import { mathPlugin, makeBlockMathInputRule, mathBackspaceCmd } from '@benrbray/prosemirror-math';
import { schema } from './schema';

// Input rule
function makeInlineMathInputRule(pattern, nodeType, getAttrs) {
    return new InputRule(pattern, (state, match, start, end) => {
        let $start = state.doc.resolve(start);
        let index = $start.index();
        let $end = state.doc.resolve(end);

        let attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;

		if (!$start.parent.canReplaceWith(index, $end.index(), nodeType)) {
            return null;
        }

		return state.tr
			.replaceRangeWith(start, end, nodeType.create(attrs, nodeType.schema.text(match[1])))
			.insertText(match[0].slice(-1), end);
	});
}

// Keymap
function buildMathCommand(pattern, nodeType) {
	return (state, dispatch) => {
		if (!state.selection.$cursor) return false;

		let from = state.selection.$cursor.pos;
		let to = state.selection.$cursor.pos;

		let $from = state.doc.resolve(from)
		let textBefore = $from.parent.textBetween(0, $from.parentOffset, null, '\ufffc');

		let match = pattern.exec(textBefore);
		if (!match) return false;

		let start = from - match[0].length;
		let end = to;

		let $start = state.doc.resolve(start);
		let index = $start.index();
		let $end = state.doc.resolve(end);

		if (!$start.parent.canReplaceWith(index, $end.index(), nodeType)) return false;

		let { tr } = state;
		tr.replaceRangeWith(start,end, nodeType.create(null, nodeType.schema.text(match[1])))
		  .scrollIntoView();
		dispatch(tr);
		return false;
	}
}

const INLINE_MATH_PATTERN = /\$([^\$]*)\$$/;
const createInlineMath = buildMathCommand(INLINE_MATH_PATTERN, schema.nodes.math_inline);
const mathKeymap = {
	'Backspace': mathBackspaceCmd,
	'Enter': createInlineMath,
	'ArrowUp': createInlineMath,
	'ArrowDown': createInlineMath,
	'ArrowLeft': createInlineMath,
	'ArrowRight': createInlineMath,
};

export { mathPlugin, mathKeymap, makeBlockMathInputRule, makeInlineMathInputRule };
