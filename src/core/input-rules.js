import {
	wrappingInputRule,
	inputRules,
	InputRule,
	textblockTypeInputRule,
	smartQuotes,
	ellipsis,
	emDash
} from 'prosemirror-inputrules';

import { schema } from './schema';

function markInputRule(regexp, markType, size) {
  return new InputRule(regexp, (state, match, start, end) => {
    let to = end;
    let from = match[1] ? to - match[1].length + 1 : start;
	  if (schema.marks.code
		  && schema.marks.code.isInSet(state.doc.resolve(from + 1).marks())) {
		  return;
	  }

    let tr = state.tr.addMark(from, to, markType.create());
    if (size > 1) {
      tr = tr.delete(to - (size - 1), to);
    }
    return tr.delete(from, from + size).removeStoredMark(markType);
  });
}

function linkInputRule() {
	let regexp = /(^|[^!])\[(.*?)\]\((\S+)\)$/;
	return new InputRule(regexp, (state, match, start, end) => {
		return state.tr.replaceWith(
			start + match[1].length,
			end,
			schema.text(match[2], [schema.mark('link', { href: match[3] })])
		);
	});
}

export function buildInputRules() {
	let rules = [
		...smartQuotes,
		ellipsis,
		emDash,
		wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote),
		wrappingInputRule(/^\s*(1\.)\s$/, schema.nodes.orderedList),
		wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bulletList),
		linkInputRule(),
		markInputRule(/(?:[^`0-9A-Za-z]+)(__([^\s_][^_]+)__)$|^(__([^\s _][^_]+)__)$/, schema.marks.strong, 2),
		markInputRule(/^(?:[^`]+)(\*\*([^\s*][^*]+)\*\*)$|^(\*\*([^\s*][^*]+)\*\*)$/, schema.marks.strong, 2),
		markInputRule(/(?:[^_`0-9A-Za-z]+)(_([^\s_][^_]+?)_)$|^(_([^\s_][^_]+)_)$/, schema.marks.em, 1),
		markInputRule(/^(?:[^*`]+)(\*([^\s*][^*]+?)\*)$|^(\*([^\s*][^*]+)\*)$/, schema.marks.em, 1),
		markInputRule(/^(?:[^`]+)(~~([^\s~][^~]+)~~)$|^(~~([^\s~][^~]+)~~)$/, schema.marks.strike, 2),
		markInputRule(/(`[^\s`].*`)$/, schema.marks.code, 1),
		textblockTypeInputRule(new RegExp("^(#{1,6}) $"), schema.nodes.heading, match => ({level: match[1].length})),
	];
	return inputRules({ rules });
}
