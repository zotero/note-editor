import { Plugin } from 'prosemirror-state';
import { DOMSerializer } from 'prosemirror-model';
import { defaultMarkdownSerializer } from "prosemirror-markdown";
import { serializeCitationInnerText } from '../schema/utils';
import { customTextBetween } from '../commands';

function getMarkdownSerializer() {
	const serializer = defaultMarkdownSerializer;
	serializer.marks['bold'] = { open: "*", close: "*", mixable: true, expelEnclosingWhitespace: true };
	serializer.marks['highlight'] = { open: "==", close: "==", mixable: true, expelEnclosingWhitespace: true };
	serializer.marks['italic'] = { open: "_", close: "_", mixable: true, expelEnclosingWhitespace: true };
	serializer.marks['strike'] = { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true };
	serializer.marks['subsup'] = { open: "", close: "", mixable: true, expelEnclosingWhitespace: true };
	serializer.marks['textColor'] = { open: "", close: "", mixable: true, expelEnclosingWhitespace: true };
	serializer.marks['backgroundColor'] = { open: "", close: "", mixable: true, expelEnclosingWhitespace: true };
	serializer.marks['underline'] = { open: "", close: "", mixable: true, expelEnclosingWhitespace: true };

	serializer.nodes['bulletList'] = serializer.nodes.bullet_list;
	serializer.nodes['codeBlock'] = serializer.nodes.code_block;
	serializer.nodes['hardBreak'] = serializer.nodes.hard_break;
	serializer.nodes['horizontalRule'] = serializer.nodes.horizontal_rule;
	serializer.nodes['listItem'] = serializer.nodes.list_item;
	serializer.nodes['orderedList'] = serializer.nodes.ordered_list;

	serializer.nodes['highlight'] = (state, node) => {
		state.renderInline(node)
	};

	serializer.nodes['citation'] = (state, node) => {
		state.write(serializeCitationInnerText(node));
	};

	serializer.nodes['math_display'] = (state, node) => {
		state.write('$$' + node.textContent + '$$\n\n');
	};

	serializer.nodes['math_inline'] = (state, node) => {
		state.write('$' + node.textContent + '$');
	};

	serializer.nodes['image'] = (state, node) => {
	};

	serializer.nodes['math_inline'] = (state, node) => {
		state.renderInline(node);
	};

	serializer.nodes['math_display'] = (state, node) => {
		state.renderContent(node);
	};

	serializer.nodes['table'] = (state, node) => {
		state.renderContent(node)
	};

	serializer.nodes['table_row'] = (state, node) => {
		state.renderContent(node)
	};

	serializer.nodes['table_cell'] = (state, node) => {
		state.renderContent(node)
	};

	serializer.nodes['table_header'] = (state, node) => {
		state.renderContent(node)
	};

	return serializer;
}

// Taken prosemirror-view __serializeForClipboard
var wrapMap = {
	thead: ["table"],
	tbody: ["table"],
	tfoot: ["table"],
	caption: ["table"],
	colgroup: ["table"],
	col: ["table", "colgroup"],
	tr: ["table", "tbody"],
	td: ["table", "tbody", "tr"],
	th: ["table", "tbody", "tr"]
};
var _detachedDoc = null;

function detachedDoc() {
	return _detachedDoc || (_detachedDoc = document.implementation.createHTMLDocument("title"))
}

function serializeForClipboard(view, slice) {
	var context = [];
	var content = slice.content;
	var openStart = slice.openStart;
	var openEnd = slice.openEnd;
	while (openStart > 1 && openEnd > 1 && content.childCount == 1 && content.firstChild.childCount == 1) {
		openStart--;
		openEnd--;
		var node = content.firstChild;
		context.push(node.type.name, node.attrs != node.type.defaultAttrs ? node.attrs : null);
		content = node.content;
	}

	var serializer = view.someProp("clipboardSerializer") || DOMSerializer.fromSchema(view.state.schema);
	var doc = detachedDoc(), wrap = doc.createElement("div");
	wrap.appendChild(serializer.serializeFragment(content, { document: doc }));

	var firstChild = wrap.firstChild, needsWrap;
	while (firstChild && firstChild.nodeType == 1 && (needsWrap = wrapMap[firstChild.nodeName.toLowerCase()])) {
		for (var i = needsWrap.length - 1; i >= 0; i--) {
			var wrapper = doc.createElement(needsWrap[i]);
			while (wrap.firstChild) {
				wrapper.appendChild(wrap.firstChild);
			}
			wrap.appendChild(wrapper);
			if (needsWrap[i] != "tbody") {
				openStart++;
				openEnd++;
			}
		}
		firstChild = wrap.firstChild;
	}

	if (firstChild && firstChild.nodeType == 1) {
		firstChild.setAttribute("data-pm-slice", (openStart + " " + openEnd + " " + (JSON.stringify(context))));
	}

	return { dom: wrap }
}

export function markdownSerializer() {
	let view;
	return new Plugin({
		view(_view) {
			view = _view;
			return {
				update(view) {}
			};
		},
		props: {
			clipboardTextSerializer: (slice) => {
				let { state } = view;
				let { selection } = state;
				let { $from } = selection;
				let depth = $from.depth;
				do {
					parent = $from.node(depth);
					depth--;
				} while (!parent.isBlock);
				// If block node or i.e. citation node is selected
				if ((selection.node && selection.node.isBlock) || parent.textContent.length <= slice.content.textBetween(0, slice.content.size).length) {
					if (typeof zoteroTranslateToMarkdown !== 'undefined') {
						let ref = serializeForClipboard(view, slice);
						let dom = ref.dom;
						dom.querySelectorAll('img').forEach(node => node.remove())
						return zoteroTranslateToMarkdown(dom.innerHTML);
					}
					else {
						let serializer = getMarkdownSerializer();
						return serializer.serialize(slice.content, {
							tightLists: true,
							paragraphNewlines: 1,
						});
					}
				}
				return customTextBetween(slice.content, 0, slice.content.size, '\n\n');
			},
		}
	});
}
