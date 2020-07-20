import { wrappingInputRule, inputRules } from 'prosemirror-inputrules'

export function buildInputRules(schema) {
  let rules = [
    wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote),
    wrappingInputRule(/^(\d+)\.\s$/, schema.nodes.ordered_list, match => ({ order: +match[1] }), (match, node) => node.childCount + node.attrs.order == +match[1]),
    wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bullet_list)
  ];

  return inputRules({ rules })
}
