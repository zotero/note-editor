import { MarkdownParser } from 'prosemirror-markdown';
import MarkdownIt from 'markdown-it';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Slice } from 'prosemirror-model';
import { schema } from '../schema';

// Returns true if content looks like math according to heuristics:
// - contains a LaTeX-like command (\frac, \sqrt, \alpha, etc.), OR
// - has balanced braces with at least one pair, OR
// - has at least N operator-like tokens (=, +, -, *, /, ^, _)
function isMathish(content) {
	const MIN_OPERATORS = 1;
	if (!content) return false;

	let text = String(content).trim();
	if (!text) return false;

	// Ignore trivial numeric values (helps with currency like "$20")
	if (/^\d+(?:[.,]\d+)?$/.test(text)) return false;

	// LaTeX-ish command: \alpha, \frac, \sqrt, \sum, etc.
	let hasCommand = /\\[a-zA-Z]+/.test(text);

	// Count operators. We include ^ and _ because they are math markers.
	// We avoid counting a single leading minus of a number by removing leading +/- on a number
	let sanitized = text.replace(/(^|\s)[+-](?=\d)/g, ' ');
	let operators = (sanitized.match(/[+\-*/=^_]/g) || []).length;
	let hasEnoughOperators = operators >= MIN_OPERATORS;

	// Balanced braces check
	let open = (text.match(/{/g) || []).length;
	let close = (text.match(/}/g) || []).length;
	let hasAnyBraces = open > 0 || close > 0;
	let balancedBraces = open > 0 && open === close;
	if (hasAnyBraces && !balancedBraces) {
		return false;
	}

	// Accept if any of the math-ish signals hold
	if (hasCommand || balancedBraces || hasEnoughOperators) {
		return true;
	}

	return false;
}

function inlineMathPlugin(md) {
	md.inline.ruler.after('escape', 'math_inline', (state, silent) => {
		let start = state.pos;
		if (state.src[start] !== '$') return false;
		if (state.src[start + 1] === '$') return false; // don't match $$

		// Avoid matching inside code spans
		if (state.tokens && state.tokens.some(t => t.type === 'code_inline')) return false;

		let pos = start + 1;
		let found = false;
		while (pos < state.posMax) {
			if (state.src[pos] === '$') {
				// Count preceding backslashes to detect escaped $
				let backslashes = 0;
				for (let prev = pos - 1; prev >= 0 && state.src[prev] === '\\'; prev--) {
					backslashes++;
				}
				if ((backslashes % 2) === 0) {
					found = true;
					break;
				}
			}
			pos++;
		}
		if (!found) return false;

		// Disallow empty or all-whitespace content
		let contentRaw = state.src.slice(start + 1, pos);
		if (!contentRaw || /^\s+$/.test(contentRaw)) return false;

		// Strict math heuristics
		if (!isMathish(contentRaw)) {
			return false;
		}

		if (!silent) {
			let token = state.push('math_inline', 'span', 0);
			token.content = contentRaw;
			token.attrs = [['class', 'math']];
		}
		state.pos = pos + 1;
		return true;
	});
}

function blockMathPlugin(md) {
	function isFence(line, state) {
		let start = state.bMarks[line] + state.tShift[line];
		let max = state.eMarks[line];
		if (start + 2 > max) return false;
		// Line must start with $$ and contain nothing else except spaces/tabs
		if (!(state.src[start] === '$' && state.src[start + 1] === '$')) return false;
		for (let i = start + 2; i < max; i++) {
			let ch = state.src.charCodeAt(i);
			// not space or tab
			if (ch !== ' ' && ch !== '\t') {
				return false;
			}
		}
		return true;
	}

	md.block.ruler.after('fence', 'math_block', (state, startLine, endLine, silent) => {
		if (!isFence(startLine, state)) return false;

		let contentStart = state.bMarks[startLine] + state.tShift[startLine] + 2;

		let nextLine = startLine;
		let haveEndMarker = false;
		let contentEnd = state.eMarks[startLine];

		while (true) {
			nextLine++;
			if (nextLine >= endLine) break;
			if (isFence(nextLine, state)) {
				haveEndMarker = true;
				contentEnd = state.bMarks[nextLine];
				break;
			}
		}

		if (!haveEndMarker) return false;
		if (silent) return true;

		let raw = state.src.slice(contentStart, contentEnd);
		// Trim leading/trailing blank lines and surrounding whitespace
		let content = raw.replace(/^\s*\n?|\n?\s*$/g, '');

		if (!isMathish(content)) {
			return false;
		}

		// Advance parser to the line after closing fence
		state.line = nextLine + 1;

		let token = state.push('math_block', 'div', 0);
		token.block = true;
		token.map = [startLine, nextLine + 1];
		token.content = content;
		token.attrs = [['class', 'math']];
		return true;
	});
}

function createMarkdownIt() {
	let md = new MarkdownIt('commonmark', {
		html: false,
		linkify: true,
		breaks: false
	}).enable(['table', 'strikethrough']);

	// Ensure inline content in table cells is wrapped in paragraphs
	md.core.ruler.after('inline', 'pm_table_cell_paragraphs', (state) => {
		let Token = state.Token;
		let toks = state.tokens;

		for (let i = 0; i < toks.length; i++) {
			let t = toks[i];

			if (t.type === 'th_open' || t.type === 'td_open') {
				if (i + 1 < toks.length && toks[i + 1].type === 'inline') {
					let paraOpen = new Token('paragraph_open', 'p', 1);
					paraOpen.block = true;

					let paraClose = new Token('paragraph_close', 'p', -1);
					paraClose.block = true;

					// Insert paragraph tokens around the inline content
					toks.splice(i + 1, 0, paraOpen);
					// After inserting paraOpen, inline token is now at i+2
					toks.splice(i + 3, 0, paraClose);

					// Skip the paragraph we just inserted
					i += 3;
				}
			}
		}
	});

	inlineMathPlugin(md);
	blockMathPlugin(md);

	return md;
}

// Detection-only MarkdownIt with linkify disabled to avoid URL-only false positives
function createDetectMarkdownIt() {
	let md = new MarkdownIt('commonmark', {
		html: false,
		linkify: false, // key difference
		breaks: false
	}).enable(['table', 'strikethrough']);

	inlineMathPlugin(md);
	blockMathPlugin(md);

	return md;
}

function buildMarkdownParser(schema) {
	let md = createMarkdownIt();

	let attr = (tok, name) => (tok.attrGet ? tok.attrGet(name) : null);

	let tokens = {
		// Nodes
		paragraph: { block: 'paragraph' },
		blockquote: { block: 'blockquote' },
		hr: { node: 'horizontalRule' },
		heading: {
			block: 'heading',
			getAttrs: tok => ({ level: Number(tok.tag.slice(1)) || 1 })
		},
		bullet_list: { block: 'bulletList' },
		ordered_list: {
			block: 'orderedList',
			getAttrs: tok => {
				let start = Number(attr(tok, 'start') || '1');
				return { order: Number.isFinite(start) ? start : 1 };
			}
		},
		list_item: { block: 'listItem' },
		code_block: { block: 'codeBlock', noCloseToken: true },
		fence: { block: 'codeBlock', noCloseToken: true },
		hardbreak: { node: 'hardBreak' },
		image: {
			node: 'image',
			getAttrs: tok => ({
				src: attr(tok, 'src') || '',
				alt: tok.content || '',
				title: attr(tok, 'title') || null
			})
		},
		math_inline: {
			block: 'math_inline',
			noCloseToken: true
		},
		math_block: {
			block: 'math_display',
			noCloseToken: true
		},
		table: { block: 'table' },
		tr: { block: 'table_row' },
		th: { block: 'table_header' },
		td: { block: 'table_cell' },
		thead: { ignore: true },
		tbody: { ignore: true },
		tfoot: { ignore: true },
		// Marks
		em: { mark: 'em' },
		strong: { mark: 'strong' },
		s: { mark: 'strike' },
		code_inline: { mark: 'code', noCloseToken: true },
		link: {
			mark: 'link',
			getAttrs: tok => {
				let href = attr(tok, 'href') || '';
				let title = attr(tok, 'title') || null;
				return { href, title };
			}
		},
	};

	// Filter out mappings for nodes/marks that don't exist in the provided schema
	let filtered = {};
	for (let [key, spec] of Object.entries(tokens)) {
		if (spec.ignore) {
			filtered[key] = { ignore: true };
			continue;
		}
		if (spec.block) {
			if (schema.nodes[spec.block]) filtered[key] = spec;
		} else if (spec.node) {
			if (schema.nodes[spec.node]) filtered[key] = spec;
		} else if (spec.mark) {
			if (schema.marks[spec.mark]) filtered[key] = spec;
		} else {
			filtered[key] = spec;
		}
	}

	return new MarkdownParser(schema, md, filtered);
}

let mdParser = buildMarkdownParser(schema);

// Detection markdown-it (no linkify) and a couple of helpers
let mdDetect = createDetectMarkdownIt();

function normalizeEol(text) {
	return String(text).replace(/\r\n?/g, '\n');
}

function isJustUrlOrEmail(text) {
	let t = normalizeEol(text).trim();
	// Plain URL or email on its own line(s) => treat as plain text
	let url = /^(?:https?:\/\/|www\.)[^\s]+$/i;
	let email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	// Allow multi-line but each line must be URL/email only
	return t.length > 0 && t.split('\n').every(line => url.test(line) || email.test(line));
}

function hasInlineMathHeuristic(text) {
	let src = normalizeEol(text);
	let len = src.length;
	let i = 0;

	// Skip inline code spans to avoid $ inside `code` being counted
	let isBacktick = (idx) => src[idx] === '`';
	let isDollar = (idx) => src[idx] === '$';
	let isEscaped = (idx) => {
		let b = idx - 1, count = 0;
		while (b >= 0 && src[b] === '\\') { count++; b--; }
		return (count % 2) === 1;
	};

	while (i < len) {
		// Skip code spans
		if (isBacktick(i)) {
			let start = i;
			i++; // move past first `
			// find matching unescaped `
			while (i < len && !isBacktick(i)) i++;
			// consume last `
			if (i < len) i++;
			continue;
		}

		// Detect $...$ (not $$)
		if (isDollar(i) && !isEscaped(i)) {
			// do not treat $$ as inline opener
			if (i + 1 < len && isDollar(i + 1)) {
				i += 2;
				continue;
			}
			let open = i;
			let j = open + 1;
			let found = false;
			while (j < len) {
				if (isDollar(j) && !isEscaped(j)) {
					// ensure not $$ closer (inline must be single $)
					if (!(j + 1 < len && isDollar(j + 1))) {
						found = true;
						break;
					}
				}
				j++;
			}
			if (!found) {
				i++;
				continue;
			}

			let content = src.slice(open + 1, j);
			// Disallow empty/whitespace-only
			if (content && !/^\s+$/.test(content)) {
				if (isMathish(content)) return true;
			}
			i = j + 1;
			continue;
		}

		i++;
	}
	return false;
}

function hasBlockMathHeuristic(text) {
	let lines = normalizeEol(text).split('\n');
	let isFenceLine = (line) => {
		// $$ with only spaces/tabs around
		let trimmed = line.trim();
		if (!trimmed.startsWith('$$')) return false;
		// must be exactly $$ plus optional trailing spaces
		return /^\$\$\s*$/.test(trimmed);
	};

	for (let i = 0; i < lines.length; i++) {
		if (!isFenceLine(lines[i])) continue;

		let j = i + 1;
		let foundClose = false;
		let chunk = [];
		for (; j < lines.length; j++) {
			if (isFenceLine(lines[j])) {
				foundClose = true;
				break;
			}
			chunk.push(lines[j]);
		}
		if (!foundClose) {
			// unmatched fence -> ignore (let later stages decide)
			continue;
		}

		let content = chunk.join('\n').replace(/^\s*\n?|\n?\s*$/g, '');
		if (content && isMathish(content)) return true;
		i = j; // continue after the closing fence
	}
	return false;
}

function hasSetextHeading(text) {
	// Detect:
	//   Line N: non-empty text
	//   Line N+1: only ===... or ---... (with optional surrounding whitespace)
	// CommonMark treats '---' as H2 underline when preceded by non-blank text.
	let lines = normalizeEol(text).split('\n');

	for (let i = 0; i < lines.length - 1; i++) {
		let line = lines[i];
		let next = lines[i + 1];

		// Require non-empty heading text
		if (!line || !line.trim()) continue;

		// Underline must be only = or - characters (any length >= 1), with optional whitespace
		let m = next.match(/^\s*(=+|-+)\s*$/);
		if (!m) continue;

		// This looks like a Setext underline; accept
		return true;
	}
	return false;
}

/**
 * Detects the presence of explicit Markdown syntax with conservative checks
 */
function hasExplicitMarkdownSyntax(text) {
	if (!text) return false;
	let t = normalizeEol(text);

	// Block-level constructs
	let heading = /^(?:#{1,6})\s+\S+/m;
	let blockquote = /^>\s+\S+/m;
	let list = /^(?:\s*)(?:[*+-]|\d{1,9}\.)\s+\S+/m;
	let fencedCode = /^(?:```|~~~)[^\n]*\n[\s\S]*?\n(?:```|~~~)\s*$/m;
	let hr = /^(?:\s{0,3})(?:-{3,}|\*{3,}|_{3,})\s*$/m;
	let tableHeader = /^\s*\|.+\|\s*\n\s*\|?[\s:|\-]+$/m;

	// Inline constructs
	let inlineCode = /`[^`\n]+`/;
	let strong = /(\*\*|__)(?=\S)(?:[\s\S]*?\S)\1/;
	let em = /(\*|_)(?=\S)(?:[\s\S]*?\S)\1/;
	let image = /!\[[^\]]*?\]\([^)]+?\)/;
	let link = /\[[^\]]+?\]\([^)]+?\)/;
	let hardBreakTwoSpaces = / {2,}\n/;
	let strike = /~~(?=\S)(?:[\s\S]*?\S)~~/;

	let inlineMathHeuristic = hasInlineMathHeuristic(t);
	let blockMathHeuristic = hasBlockMathHeuristic(t);

	let setextHeading = hasSetextHeading(t);

	return (
		setextHeading ||
		heading.test(t) ||
		blockquote.test(t) ||
		list.test(t) ||
		fencedCode.test(t) ||
		hr.test(t) ||
		tableHeader.test(t) ||
		inlineCode.test(t) ||
		strong.test(t) ||
		em.test(t) ||
		image.test(t) ||
		link.test(t) ||
		hardBreakTwoSpaces.test(t) ||
		strike.test(t) ||
		inlineMathHeuristic ||
		blockMathHeuristic
	);
}

/**
 * Token-based scoring using Markdown-It with linkify disabled.
 * Returns a structure with counts and a boolean "looksMarkdown".
 */
function scoreMarkdownTokens(text) {
	let src = normalizeEol(text);
	let tokens = mdDetect.parse(src, {});
	let counts = {
		blocks: 0,
		headings: 0,
		lists: 0,
		listItems: 0,
		blockQuotes: 0,
		fences: 0,
		hrs: 0,
		tables: 0,
		images: 0,
		inlineCode: 0,
		em: 0,
		strong: 0,
		linksExplicit: 0, // will validate via regex presence
		math: 0,
		hardBreaks: 0,
		paragraphs: 0,
		strike: 0
	};

	// Pre-checks for explicit inline syntaxes present in raw text
	let hadExplicitLink = /\[[^\]]+?\]\([^)]+?\)/.test(src);
	let hadExplicitImage = /!\[[^\]]*?\]\([^)]+?\)/.test(src);
	let hadInlineCode = /`[^`\n]+`/.test(src);
	let hadEm = /(\*|_)(?=\S)(?:[\s\S]*?\S)\1/.test(src);
	let hadStrong = /(\*\*|__)(?=\S)(?:[\s\S]*?\S)\1/.test(src);
	let hadHardBreak = / {2,}\n/.test(src);
	let hadMath = /(?<!\$)\$[^\s$][^$\n]*\$(?!\$)/.test(src) || /^(?:\$\$)\s*$[\s\S]*?^(?:\$\$)\s*$/m.test(src);
	let hadStrike = /~~(?=\S)(?:[\s\S]*?\S)~~/.test(src);

	// Track table pipe consistency to avoid false positives for accidental pipes
	let tableRowPipes = [];

	for (let i = 0; i < tokens.length; i++) {
		let t = tokens[i];
		switch (t.type) {
			case 'heading_open':
				counts.blocks++; counts.headings++; break;
			case 'blockquote_open':
				counts.blocks++; counts.blockQuotes++; break;
			case 'bullet_list_open':
			case 'ordered_list_open':
				counts.blocks++; counts.lists++; break;
			case 'list_item_open':
				counts.listItems++; break;
			case 'fence':
			case 'code_block':
				counts.blocks++; counts.fences++; break;
			case 'hr':
				counts.blocks++; counts.hrs++; break;
			case 'table_open':
				counts.blocks++; counts.tables++; break;
			case 'inline':
				// inspect children for inline marks
				if (t.children) {
					for (let c of t.children) {
						if (c.type === 'image') counts.images += hadExplicitImage ? 2 : 0;
						if (c.type === 'code_inline') counts.inlineCode += hadInlineCode ? 1 : 0;
						if (c.type === 'em_open') counts.em += hadEm ? 1 : 0;
						if (c.type === 'strong_open') counts.strong += hadStrong ? 1 : 0;
						if (c.type === 'link_open') counts.linksExplicit += hadExplicitLink ? 2 : 0;
						if (c.type === 'hardbreak') counts.hardBreaks += hadHardBreak ? 1 : 0;
						if (c.type === 'math_inline') counts.math += hadMath ? 2 : 0;
						if (c.type === 's_open') counts.strike += hadStrike ? 1 : 0;
					}
				}
				break;
			case 'paragraph_open':
				counts.paragraphs++; break;
			case 'math_block':
				counts.blocks++; counts.math++; break;
			default:
				break;
		}

		// Track table pipe counts by reading raw lines between row open/close if available
		if (t.type === 'tr_open' && i + 1 < tokens.length) {
			// Try to read the inline text of each cell to count pipe occurrences in source
			let j = i + 1;
			let rowText = '';
			while (j < tokens.length && tokens[j].type !== 'tr_close') {
				if (tokens[j].type === 'inline' && tokens[j].content) rowText += tokens[j].content;
				j++;
			}
			if (rowText) {
				let pipes = (rowText.match(/\|/g) || []).length;
				tableRowPipes.push(pipes);
			}
		}
	}

	// Table sanity: if we think we have a table, require at least two rows with a consistent number of pipes
	if (counts.tables > 0) {
		let consistent = tableRowPipes.length >= 2 && tableRowPipes.every(p => p === tableRowPipes[0]);
		if (!consistent) {
			// discount table detection if inconsistent
			counts.tables = 0;
			// do not decrement blocks below zero
			counts.blocks = Math.max(0, counts.blocks - 1);
		}
	}

	// List sanity: require at least 2 items, or 1 item but with nested structure (already captured as blocks)
	if (counts.lists > 0 && counts.listItems < 2) {
		// Discount weak one-item lists (common accidental pattern like "* word")
		counts.lists = 0;
		counts.blocks = Math.max(0, counts.blocks - 1);
	}

	// Inline bundle score (explicit markers only)
	let inlineScore =
		counts.inlineCode +
		counts.em +
		counts.strong +
		counts.linksExplicit +
		counts.images +
		counts.hardBreaks +
		counts.math +
		counts.strike;

	let looksMarkdown = (counts.blocks > 0) || (inlineScore >= 1);

	return { counts, looksMarkdown };
}

/**
 * Traverses a ProseMirror document to find whether it contains any "markdown-only"
 * structures supported by the current schema. We exclude things that could happen
 * without explicit markdown syntax (e.g., autolink).
 */
function docHasMarkdownFeatures(doc, sourceText) {
	let found = {
		heading: false,
		blockquote: false,
		list: false,
		codeBlock: false,
		hr: false,
		image: false,
		table: false,
		math: false,
		hardBreak: false,
		inlineCode: false,
		em: false,
		strong: false,
		linkExplicit: false,
		strike: false
	};

	let has = (name) => !!schema.nodes[name] || !!schema.marks[name];

	let hadExplicitLink = /\[[^\]]+?\]\([^)]+?\)/.test(sourceText || '');
	let hadExplicitImage = /!\[[^\]]*?\]\([^)]+?\)/.test(sourceText || '');
    // Keep inline code/em/strong conservative
	let hadInlineCode = /`[^`\n]+`/.test(sourceText || '');
	let hadEm = /(\*|_)(?=\S)([\s\S]*?\S)\1/.test(sourceText || '');
	let hadStrong = /(\*\*|__)(?=\S)([\s\S]*?\S)\1/.test(sourceText || '');
	let hadHardBreak = / {2,}\n/.test(sourceText || '');
	let hadMath = /(?<!\$)\$[^\s$][^$\n]*\$(?!\$)/.test(sourceText || '') || /^(?:\$\$)\s*$[\s\S]*?^(?:\$\$)\s*$/m.test(sourceText || '');
	let hadStrike = /~~(?=\S)(?:[\s\S]*?\S)~~/.test(sourceText || ''); // NEW

	doc.descendants((node) => {
		let type = node.type.name;

		if (has('heading') && type === 'heading') found.heading = true;
		if (has('blockquote') && type === 'blockquote') found.blockquote = true;
		if ((has('bulletList') && type === 'bulletList') || (has('orderedList') && type === 'orderedList')) {
			found.list = true;
		}
		if (has('codeBlock') && type === 'codeBlock') found.codeBlock = true;
		if (has('horizontalRule') && type === 'horizontalRule') found.hr = true;
		if (has('image') && type === 'image') found.image = true;
		if (has('table') && (type === 'table' || type === 'table_row' || type === 'table_cell' || type === 'table_header')) {
			found.table = true;
		}
		if ((has('math_inline') && type === 'math_inline') || (has('math_display') && type === 'math_display')) {
			found.math = true;
		}
		if (has('hardBreak') && type === 'hardBreak') found.hardBreak = true;

		if (node.marks && node.marks.length) {
			for (let m of node.marks) {
				if (schema.marks.code && m.type.name === 'code') found.inlineCode = true;
				if (schema.marks.em && m.type.name === 'em') found.em = true;
				if (schema.marks.strong && m.type.name === 'strong') found.strong = true;
				if (schema.marks.link && m.type.name === 'link') {
					// Count links only if explicit [text](url) syntax was present
					if (hadExplicitLink) found.linkExplicit = true;
				}
				if (schema.marks.strike && m.type.name === 'strike') {
					if (hadStrike) found.strike = true;
				}
			}
		}
		return true;
	});

	// Only consider marks that we saw explicit syntax for to reduce false positives
	let hasInlineMarks =
		(found.inlineCode && hadInlineCode) ||
		(found.em && hadEm) ||
		(found.strong && hadStrong) ||
		(found.strike && hadStrike) ||
		found.linkExplicit;

	// Hard break only counts if source had the two-spaces marker
	let hasHardBreak = found.hardBreak && / {2,}\n/.test(sourceText || '');

	return (
		found.heading ||
		found.blockquote ||
		found.list ||
		found.codeBlock ||
		found.hr ||
		(found.image && /!\[[^\]]*?\]\([^)]+?\)/.test(sourceText || '')) ||
		found.table ||
		(found.math && /(?<!\$)\$[^\s$][^$\n]*\$(?!\$)/.test(sourceText || '') || /^(?:\$\$)\s*$[\s\S]*?^(?:\$\$)\s*$/m.test(sourceText || '')) ||
		hasInlineMarks ||
		hasHardBreak
	);
}

function isValidMarkdown(text) {
	if (typeof text !== 'string') return false;
	let t = normalizeEol(text);

	if (!t.trim()) return false;
	if (isJustUrlOrEmail(t)) return false;

	// 1) raw explicit syntax
	if (!hasExplicitMarkdownSyntax(t)) return false;

	// 2) token-based shape (defensive)
	let tokenScore = scoreMarkdownTokens(t);
	if (!tokenScore.looksMarkdown) return false;

	// 3) schema-backed parse check
	try {
		let doc = mdParser.parse(t);
		if (!doc || doc.content.size === 0) return false;

		return docHasMarkdownFeatures(doc, t);
	} catch {
		return false;
	}
}

class Markdown {
	constructor() {
		this.view = null;
	}

	update(state, _oldState) {
	}

	destroy() {
		this.view = null;
	}

	insertMarkdown(text) {
		if (!this.view) return false;
		if (!text || typeof text !== 'string') return false;

		try {
			let doc = mdParser.parse(text);
			if (!doc || doc.content.size === 0) return false;

			let { state, dispatch } = this.view;

			// If the parsed doc is exactly one paragraph, insert its inline content
			if (doc.childCount === 1 && doc.firstChild.type.name === 'paragraph') {
				let inlineContent = doc.firstChild.content; // a Fragment with inline nodes
				dispatch(state.tr.replaceSelection(new Slice(inlineContent, 0, 0)).scrollIntoView());
				return true;
			}

			// Otherwise, insert as-is (blocks)
			let slice = new Slice(doc.content, 0, 0);
			dispatch(state.tr.replaceSelection(slice).scrollIntoView());
			return true;
		} catch (e) {
			return false;
		}
	}
}

export let markdownParserKey = new PluginKey('markdown');
export function markdownParser() {
	let plugin = new Plugin({
		key: markdownParserKey,
		state: {
			init() {
				return new Markdown();
			},
			apply(tr, pluginState) {
				// Keep instance; no internal state from transactions yet
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = markdownParserKey.getState(view.state);
			pluginState.view = view;

			return {
				update(view, lastState) {
					pluginState.update(view.state, lastState);
				},
				destroy() {
					pluginState.destroy();
				}
			};
		},
		props: {
			handlePaste(view, event) {
				let pluginState = markdownParserKey.getState(view.state);
				if (!pluginState) return false;

				let dt = event?.clipboardData;
				if (!dt) return false;

				// Only handle paste when the clipboard has exactly one data type: text/plain
				let types = Array.from(dt.types || []);
				if (!(types.length === 1 && types[0] === 'text/plain')) {
					return false; // allow other plugins to handle
				}

				let text = dt.getData('text/plain') || '';
				if (!text) return false;

				// Validate that the text is Markdown; otherwise skip to allow others
				if (!isValidMarkdown(text)) {
					return false;
				}

				// Insert and, if successful, prevent other plugins (drop-paste.js) from handling
				let handled = pluginState.insertMarkdown(text);
				if (handled) {
					event.preventDefault();
					return true; // stop further handling
				}
				return false;
			}
		}
	});

	return plugin;
}
