import { Plugin } from 'prosemirror-state/src';
import { schema } from '../schema';
import { PluginKey } from 'prosemirror-state';

// TODO: Do other transformations as well i.e. insert space between highlights, citations

function nodeEqualsType({ types, node }) {
	return (Array.isArray(types) && types.includes(node.type)) || node.type === types
}

export let trailingParagraphKey = new PluginKey('trailingParagraph');

export function trailingParagraph() {

	let options = {
		node: 'paragraph',
		notAfter: [
			'paragraph'
		]
	};

	const disabledNodes = Object.entries(schema.nodes)
	.map(([, value]) => value)
	.filter(node => options.notAfter.includes(node.name));

	return new Plugin({
		key: trailingParagraphKey,
		view(view) {
			return {
				update(view) {
					const { state } = view
					const insertNodeAtEnd = trailingParagraphKey.getState(state)

					if (!insertNodeAtEnd) {
						return
					}

					const { doc, schema, tr } = state
					const type = schema.nodes[options.node]
					const transaction = tr.insert(doc.content.size, type.create())
					view.dispatch(transaction)
				}
			}
		},
		state: {
			init(_, state) {
				const lastNode = state.tr.doc.lastChild
				return !nodeEqualsType({ node: lastNode, types: disabledNodes })
			},
			apply(tr, value) {
				if (!tr.docChanged) {
					return value
				}

				const lastNode = tr.doc.lastChild
				return !nodeEqualsType({ node: lastNode, types: disabledNodes })
			}
		}
	})
}
