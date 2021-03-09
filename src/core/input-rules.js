import { wrappingInputRule, inputRules } from 'prosemirror-inputrules';

export function buildInputRules(schema) {
	let rules = [
		wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote),
		wrappingInputRule(/^\s*(1\.)\s$/, schema.nodes.orderedList),
		wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bulletList)
	];

	return inputRules({ rules });
}
