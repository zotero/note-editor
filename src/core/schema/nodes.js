import { Fragment } from 'prosemirror-model';
import { tableNodes } from 'prosemirror-tables';
import { encodeObject, decodeObject, randomString, formatCitationItem } from '../utils';
import { serializeCitationInnerHTML } from './utils';

// Schema does not limit the indent level for the compatibility with
// the old notes, although the UI doesn't allow to set higher than
// MAX_INDENT values. The  CSS part doesn't support higher levels as well
export const MAX_INDENT = 7;

function getInteger(value) {
	if (value) {
		value = parseInt(value);
		if (!isNaN(value)) {
			return value;
		}
	}
	return null;
}

function style(styles) {
	let list = [];
	for (let styleName in styles) {
		if (styles[styleName]) {
			list.push(`${styleName}: ${styles[styleName]}`);
		}
	}
	return list.length && list.join(';') || null;
}

// `padding-left` / `padding-right` style attributes are converted to `data-indent'
function getIndent(dom) {
	const INDENT_WIDTH = 40; // TinyMCE padding width for a single indent
	let value = dom.style.paddingLeft || dom.style.paddingRight;
	let num = parseInt(value);
	if (Number.isInteger(num)
		&& num + 'px' === value
		&& num > 0
		&& (num % INDENT_WIDTH === 0)) {
		return num / INDENT_WIDTH;
	}

	let indent = dom.getAttribute('data-indent');
	if (indent) {
		indent = parseInt(indent);
		if (Number.isInteger(indent) && indent >= 1) {
			return indent;
		}
	}

	return null;
}

function getAlign(dom) {
	let value = dom.style.textAlign;
	if (value) {
		value = value.toLowerCase();
		// 'justify' doesn't work on FF (works on Chrome), although it's
		// still preserved, because the old editor had it
		if (['left', 'right', 'center', 'justify'].includes(value)) {
			return value;
		}
	}
	return null;
}

function getDir(dom) {
	let value = dom.dir;
	if (value) {
		value = value.toLowerCase();
		if (['ltr', 'rtl'].includes(value)) {
			return value;
		}
	}
	return null;
}

function backCompIndent(node) {
	const INDENT_WIDTH = 40;
	if (node.attrs.indent) {
		let dir = node.attrs.dir || window.dir;
		if (dir === 'rtl') {
			return { 'padding-right': node.attrs.indent * INDENT_WIDTH + 'px' };
		}
		else {
			return { 'padding-left': node.attrs.indent * INDENT_WIDTH + 'px' };
		}
	}
	return {};
}

export default {
	doc: {
		content: 'block+'
	},


	// Block nodes
	paragraph: {
		group: 'block',
		content: '(text | hardBreak | image | citation | highlight | underline_annotation | math_inline)*',
		attrs: {
			indent: { default: null },
			align: { default: null },
			dir: { default: null }
		},
		parseDOM: [
			{
				tag: 'p',
				getAttrs: dom => ({
					indent: getIndent(dom),
					align: getAlign(dom),
					dir: getDir(dom)
				})
			},
			{ tag: 'dd' }
		],
		toDOM: node => ['p', {
			style: style({ 'text-align': node.attrs.align, ...backCompIndent(node) }),
			dir: node.attrs.dir,
			'data-indent': node.attrs.indent
		}, 0]
	},


	heading: {
		content: '(text | hardBreak | citation | highlight | underline_annotation)*',
		group: 'block',
		defining: true,
		attrs: {
			level: { default: 1 },
			indent: { default: null },
			align: { default: null },
			dir: { default: null },
			id: { default: null }
		},
		parseDOM: [1, 2, 3, 4, 5, 6].map(level => ({
			tag: 'h' + level,
			getAttrs: dom => ({
				level,
				id: dom.getAttribute('id'),
				dir: getDir(dom),
				indent: getIndent(dom),
				align: getAlign(dom)
			})
		})),
		toDOM: node => ['h' + node.attrs.level, {
			style: style({ 'text-align': node.attrs.align, ...backCompIndent(node) }),
			id: node.attrs.id,
			dir: node.attrs.dir,
			'data-indent': node.attrs.indent
		}, 0]
	},


	math_display: {
		group: 'block math',
		content: 'text*',
		atom: true,
		code: true,
		toDOM: node => ['pre', {
			class: 'math'
		}, '$$' + node.textContent + '$$'],
		parseDOM: [{
			tag: 'pre.math',
			getContent(dom, schema) {
				let text = dom.textContent;
				text = text.trim();
				if (text.slice(0, 2) === '$$' && text.slice(-2) === '$$') {
				  text = text.slice(2, -2);
				}
				return text.length ? Fragment.from(schema.text(text)) : Fragment.empty;
			  }
		}]
	},


	codeBlock: {
		group: 'block',
		content: 'text*',
		marks: 'strong em underline strike subsup textColor backgroundColor link',
		code: true,
		defining: true,
		attrs: {
			dir: { default: null },
			indent: { default: null }
		},
		parseDOM: [{
			tag: 'pre',
			preserveWhitespace: 'full',
			getAttrs: dom => ({
				dir: getDir(dom),
				indent: getIndent(dom)
			})
		}],
		toDOM: node => ['pre', {
			style: style({ ...backCompIndent(node) }),
			dir: node.attrs.dir,
			'data-indent': node.attrs.indent
		}, 0]
	},


	blockquote: {
		content: 'block+',
		group: 'block',
		defining: true,
		parseDOM: [{ tag: 'blockquote' }],
		toDOM: () => ['blockquote', 0]
	},


	horizontalRule: {
		group: 'block',
		parseDOM: [{ tag: 'hr' }],
		toDOM: () => ['hr']
	},


	orderedList: {
		group: 'block',
		content: 'listItem+',
		attrs: {
			order: { default: 1 },
			dir: { default: null }
		},
		parseDOM: [{
			tag: 'ol',
			getAttrs: dom => ({
				order: dom.hasAttribute('start') ? +dom.getAttribute('start') : 1,
				dir: getDir(dom),
			})
		}],
		toDOM: node => (node.attrs.order === 1
			? ['ol', { dir: node.attrs.dir }, 0]
			: ['ol', {
				start: node.attrs.order,
				dir: node.attrs.dir
			}, 0])
	},


	bulletList: {
		group: 'block',
		content: 'listItem+',
		attrs: {
			dir: { default: null }
		},
		parseDOM: [{
			tag: 'ul',
			getAttrs: dom => ({
				dir: getDir(dom),
			})
		}],
		toDOM: (node) => ['ul', { dir: node.attrs.dir, }, 0]
	},


	// When joining list items two paragraphs appear
	listItem: {
		content: 'block+',
		defining: true,
		parseDOM: [{ tag: 'li' }],
		toDOM: () => ['li', 0]
	},


	...tableNodes({
		tableGroup: 'block',
		cellContent: 'block+',
		cellAttributes: {
			background: {
				default: null,
				getFromDOM(dom) {
					return dom.style.backgroundColor || null;
				},
				setDOMAttr(value, attrs) {
					if (value) attrs.style = (attrs.style || '') + `background-color: ${value};`;
				}
			}
		}
	}),


	// Inline nodes

	// TinyMCE needs non-breaking spaces to represent sequential spaces,
	// Google Docs does a similar thing when copying text. ProseMirror
	// ignores sequential spaces when serializing to DOM.
	// There are more issues related to `white-space: pre-wrap`
	// https://github.com/ProseMirror/prosemirror/issues/857
	text: {
		group: 'inline',
		toDOM: (node) => {
			return node.text.replace(/ {2}/g, ' \u00a0');
		}
	},


	hardBreak: {
		inline: true,
		group: 'inline',
		selectable: false,
		parseDOM: [{ tag: 'br' }],
		toDOM: () => ['br']
	},


	image: {
		group: 'inline',
		inline: true,
		draggable: true,
		attrs: {
			nodeID: { default: null },
			src: { default: null },
			// Clipboard serializer stores original image URL in .originalSrc,
			// while data URL is stored in .src
			originalSrc: { default: null },
			// Temporary keeps pasted/dropped image data URL in memory to make
			// sure it never gets serialized into note, even if import fails.
			// Deleted when attachImportedImage is called
			tempSrc: { default: null },
			// It's recommended to always have alt attribute
			alt: { default: '' },
			title: { default: null },
			width: { default: null },
			height: { default: null },
			attachmentKey: { default: null },
			annotation: { default: null }
		},
		parseDOM: [{
			tag: 'img',
			getAttrs: dom => {
				let annotation = decodeObject(dom.getAttribute('data-annotation'));
				// Migrate annotation.uri to annotation.attachmentURI which was used until v4
				// TODO: This can be removed as well, when most of the notes are migrated
				if (annotation && annotation.uri) {
					annotation.attachmentURI = annotation.uri;
					delete annotation.uri;
				}

				return {
					nodeID: randomString(),
					src: dom.getAttribute('src'),
					originalSrc: dom.getAttribute('data-original-src'),
					alt: dom.getAttribute('alt') || '',
					title: dom.getAttribute('title'),
					width: getInteger(dom.getAttribute('width')),
					height: getInteger(dom.getAttribute('height')),
					attachmentKey: dom.getAttribute('data-attachment-key'),
					annotation
				};
			}
		}],
		toDOM: node => ['img', {
			// Preserves the original URL (not data URL) to have a better
			// compatibility with the old client
			src: node.attrs.src,
			alt: node.attrs.alt,
			title: node.attrs.title,
			width: node.attrs.width,
			height: node.attrs.height,
			'data-attachment-key': node.attrs.attachmentKey,
			'data-annotation': node.attrs.annotation && encodeObject(node.attrs.annotation)
		}]
	},


	citation: {
		inline: true,
		group: 'inline',
		draggable: true,
		atom: true,
		selectable: true,
		attrs: {
			nodeID: { default: null },
			// Version number allows to trigger node update without actually changing it
			version: { default: 0 },
			citation: { default: null }
		},
		parseDOM: [{
			tag: 'span.citation',
			getAttrs: dom => ({
				nodeID: randomString(),
				citation: decodeObject(dom.getAttribute('data-citation'))
					|| { citationItems: [], properties: {} }
			})
		}],
		toDOM: node => {
			let children = serializeCitationInnerHTML(node);
			return ['span', {
				class: 'citation',
				'data-citation': encodeObject(node.attrs.citation)
			}, ...children]
		}
	},


	highlight: {
		inline: true,
		group: 'inline',
		content: '(text | hardBreak)*',
		defining: true,
		attrs: {
			annotation: { default: null }
		},
		parseDOM: [{
			tag: 'span.highlight',
			getAttrs: dom => {
				let annotation = decodeObject(dom.getAttribute('data-annotation'));
				if (annotation) {
					// TODO: Remove this code at some point
					// Removes `text` property encountered in pre-v3 schema
					delete annotation.text;

					// Migrate annotation.uri to annotation.attachmentURI which was used until v4
					// TODO: Remove when most of the notes are migrated
					if (annotation.uri) {
						annotation.attachmentURI = annotation.uri;
						delete annotation.uri;
					}
					return { annotation };
				}
				return false;
			}
		}],
		toDOM: node => ['span', {
			class: 'highlight',
			'data-annotation': encodeObject(node.attrs.annotation)
		}, 0]
	},


	underline_annotation: {
		inline: true,
		group: 'inline',
		content: '(text | hardBreak)*',
		defining: true,
		attrs: {
			annotation: { default: null }
		},
		parseDOM: [{
			tag: 'span.underline',
			getAttrs: dom => {
				let annotation = decodeObject(dom.getAttribute('data-annotation'));
				if (annotation) {
					return { annotation };
				}
				return false;
			}
		}],
		toDOM: node => ['span', {
			class: 'underline',
			'data-annotation': encodeObject(node.attrs.annotation)
		}, 0]
	},


	math_inline: {
		group: 'inline math',
		content: 'text*',
		marks: '',
		inline: true,
		atom: true,
		toDOM: node => ['span', {
			class: 'math'
		}, '$' + node.textContent + '$'],
		parseDOM: [{
			tag: 'span.math',
			getContent(dom, schema) {
				let text = dom.textContent;
				text = text.trim();
				if (text.slice(0, 1) === '$' && text.slice(-1) === '$') {
				  text = text.slice(1, -1);
				}
				return text.length ? Fragment.from(schema.text(text)) : Fragment.empty;
			}
		}]
	}
};
