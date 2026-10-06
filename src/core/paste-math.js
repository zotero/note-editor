import { Fragment, Slice } from 'prosemirror-model';
import { schema } from './schema';

// Scan delimiters once, consuming escaped backslashes as pairs.
function* findLatexMath(text, display = false) {
	let start = null;
	let opening = display ? '\\[' : '\\(';
	let closing = display ? '\\]' : '\\)';
	let delimiters = /\\\\|\\[()[\]]/g;
	let match;
	while ((match = delimiters.exec(text))) {
		if (match[0] === opening) start = match.index;
		else if (start !== null && match[0] === closing) {
			let content = text.slice(start + 2, match.index).trim();
			if (content) yield { start, content, end: match.index + 2 };
			start = null;
		}
	}
}

// Convert external clipboard prose after HTML parsing has resolved its structure and marks.
export function transformMathSlice(slice) {
	let isCode = node => schema.marks.code.isInSet(node.marks);
	function transformInline(fragment) {
		let children = [];
		let text = fragment.content.map(child => (child.isText && !isCode(child) ? child.text : '\n')).join('');
		let displays = findLatexMath(text, true);
		let display = displays.next().value;
		let maths = findLatexMath(text);
		let math = maths.next().value;
		let offset = 0;
		fragment.forEach((child) => {
			let start = offset;
			offset += child.isText && !isCode(child) ? child.text.length : 1;
			if (!child.isText || isCode(child)) {
				children.push(child);
				return;
			}
			let from = 0;
			while (math && math.start < offset) {
				while (display && display.end <= math.start) display = displays.next().value;
				// Keep equations split across marks, and equations inside display spans, literal.
				if (math.start >= start && math.end <= offset && !(display && math.end > display.start)) {
					let pos = math.start - start;
					if (pos > from) children.push(child.cut(from, pos));
					children.push(schema.nodes.math_inline.create(null, schema.text(math.content), child.marks));
					from = math.end - start;
				}
				math = maths.next().value;
			}
			if (from < child.text.length) children.push(child.cut(from));
		});
		return Fragment.fromArray(children);
	}
	function transform(node) {
		if (node.type === schema.nodes.paragraph) {
			// A display equation replaces a paragraph only when it occupies the whole paragraph.
			let text = node.textBetween(0, node.content.size, '', '\n').trim();
			let math = findLatexMath(text, true).next().value;
			if (math && math.start === 0 && math.end === text.length
				&& node.content.content.every(child => !isCode(child)
					&& (child.isText || child.type === schema.nodes.hardBreak))) {
				return schema.nodes.math_display.create(null, schema.text(math.content));
			}
			return node.copy(transformInline(node.content));
		}
		if (node.isLeaf || node.isAtom || node.isTextblock) return node;
		return node.copy(Fragment.fromArray(node.content.content.map(transform)));
	}
	let content = slice.content.firstChild?.isInline
		? transformInline(slice.content)
		: Fragment.fromArray(slice.content.content.map(transform));
	if (content.eq(slice.content)) return slice;
	// Replacing an open paragraph with display math must not open through the math's source.
	let limitDepth = (open, end) => {
		let node = end ? content.lastChild : content.firstChild;
		for (let depth = 0; node && depth < open; depth++) {
			if (node.isAtom) return depth;
			node = end ? node.lastChild : node.firstChild;
		}
		return open;
	};
	return new Slice(content, limitDepth(slice.openStart, false), limitDepth(slice.openEnd, true));
}
