// RTF to HTML converter tailored to the macOS RTF flavor and the note-editor schema.
// Necessary for macOS apps like Notes, TextEdit, Pages, Numbers, Keynote, Terminal.

function rtfToHtml(rtf, options = {}) {
	// -----------------------------
	// Options
	// -----------------------------
	const opt = {
		// Those are essentially for Notes.app
		headingSizeMapHalfPoints: { 40: 1, 32: 2, 26: 3 },
		...options
	};

	// -----------------------------
	// Utilities
	// -----------------------------
	const HTMLEntities = {
		'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
	};
	const escHtml = (s) => s.replace(/[<>&"']/g, ch => HTMLEntities[ch]);
	const isWhitespaceOnly = (s) => /^[\s\t\r\n]*$/.test(s);

	const toHex2 = (n) => n.toString(16).padStart(2, '0');
	const rgbToHex = (r, g, b) => `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;

	function statesEqual(a, b) {
		return a.bold === b.bold
			&& a.italic === b.italic
			&& a.underline === b.underline
			&& a.underlineColor === b.underlineColor
			&& a.strike === b.strike
			&& a.superscript === b.superscript
			&& a.subscript === b.subscript
			&& a.color === b.color
			&& a.background === b.background
			&& a.href === b.href
			&& a.fontIndex === b.fontIndex
			&& a.fontName === b.fontName
			&& a.fontNameRaw === b.fontNameRaw
			&& a.fontSizeHalfPoints === b.fontSizeHalfPoints;
	}

	function stripTrailingBreaks(runs) {
		if (!runs || !runs.length) return;
		while (runs.length) {
			const r = runs[runs.length - 1];
			if (!r) break;
			if (r.type === 'br') {
				runs.pop();
				continue;
			}
			if (!r.type && typeof r.text === 'string' && isWhitespaceOnly(r.text)) {
				runs.pop();
				continue;
			}
			break;
		}
	}

	function stripLeadingBulletGlyphs(runs) {
		if (!runs || !runs.length) return;
		const bulletPattern = /^[\s\t\r\n]*[\u2022\u00B7\u2043\-\u2012\u2013\u2014]+[\s\t\r\n]*/;
		let combined = '';
		for (const r of runs) {
			if (r && !r.type && typeof r.text === 'string') {
				combined += r.text;
				if (combined.length >= 64) break;
			}
		}
		const m = bulletPattern.exec(combined);
		if (!m || !m[0]) return;
		let remaining = m[0].length;
		for (const r of runs) {
			if (!remaining) break;
			if (!r || r.type || typeof r.text !== 'string') continue;
			if (r.text.length <= remaining) {
				remaining -= r.text.length;
				r.text = '';
			} else {
				r.text = r.text.slice(remaining);
				remaining = 0;
			}
		}
		while (runs.length && runs[0] && !runs[0].type && runs[0].text === '') runs.shift();
	}

	function parseHrefFromFldinstText(s) {
		if (!s) return null;
		let m = /HYPERLINK\b[^"]*\\l\s+"([^"]+)"/i.exec(s);
		if (m) return `#${m[1]}`;
		m = /HYPERLINK\b[^"]*"([^"]+)"/i.exec(s);
		if (m) return m[1];
		m = /HYPERLINK\b\s+((?:https?:\/\/|mailto:)[^\s\\}]+)/i.exec(s);
		if (m) return m[1];
		return null;
	}

	// -----------------------------
	// Decoder (ANSI CP1252 and \u/\'hh handling)
	// -----------------------------
	class Decoder {
		constructor() {
			this.ucSkip = 1;
			this.pendingSkip = 0;
		}
		setUc(n) { this.ucSkip = n; }
		addPendingSkip(n) { this.pendingSkip = n; }
		consumePendingSkip() {
			if (this.pendingSkip > 0) {
				this.pendingSkip--;
				return true;
			}
			return false;
		}
		decodeCP1252Byte(b) {
			const map = {
				0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
				0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D,
				0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
				0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178
			};
			if (b >= 0x80 && b <= 0x9F && map[b]) return String.fromCharCode(map[b]);
			return String.fromCharCode(b);
		}
	}

	// -----------------------------
	// TableBuilder: encapsulates table construction
	// -----------------------------
	class TableBuilder {
		constructor(appendBlock) {
			this.appendBlock = appendBlock;
			this.rows = [];
			this.curRow = [];
			this.curCell = null;
			this.lastRowFlag = false;
			this.pendingFlush = false;
		}
		startRow() {
			if (this.curRow.length) this.endRow();
			this.curRow = [];
			this.pendingFlush = false;
			this.lastRowFlag = false;
		}
		endRow() {
			if (this.curRow.length) {
				this.rows.push(this.curRow);
				this.curRow = [];
			}
		}
		startCell() {
			this.curCell = { html: '', styles: [], hasContent: false };
		}
		endCell() {
			if (!this.curCell) return;
			this.curRow.push(this.curCell);
			this.curCell = null;
		}
		setCellBackground(hex) {
			if (this.curCell && hex) this.curCell.styles.push(`background-color: ${hex}`);
		}
		append(html) {
			if (this.curCell) {
				this.curCell.html += html;
				// mark content as present only if appended HTML carries any visible text
				const textContent = html
					// remove explicit empty paragraphs
					.replace(/<p>\s*<\/p>/gi, '')
					// strip tags
					.replace(/<[^>]+>/g, '')
					.trim();
				if (textContent.length > 0) this.curCell.hasContent = true;
			}
		}
		markLastRow() { this.lastRowFlag = true; }
		flushIfLast() {
			if (!this.lastRowFlag) {
				this.pendingFlush = true;
				return;
			}
			this.flush();
		}
		flush() {
			// finalize any open cell/row
			this.endCell();
			this.endRow();
			const rowsHtml = this.rows.map(row => {
				const cells = row.map(cell => {
					const styleAttr = cell.styles.length ? ` style="${cell.styles.join('; ')}"` : '';
					return `<td${styleAttr}>${cell.html}</td>`;
				}).join('');
				return `<tr>${cells}</tr>`;
			}).join('');
			// Do not emit empty tables
			if (!rowsHtml) {
				// reset
				this.rows = [];
				this.curRow = [];
				this.curCell = null;
				this.lastRowFlag = false;
				this.pendingFlush = false;
				return;
			}
			this.appendBlock(`<table>${rowsHtml}</table>`);
			// reset
			this.rows = [];
			this.curRow = [];
			this.curCell = null;
			this.lastRowFlag = false;
			this.pendingFlush = false;
		}
	}

	// -----------------------------
	// Renderer for runs/paragraphs/headings
	// -----------------------------
	function makeParagraphHTML(runs, parState) {
		// Determine heading level
		let headingLevel = parState.headingLevel || null;

		const runsCopy = Array.isArray(runs) ? runs.slice() : [];
		// Use a separate copy for analysis to avoid stripping whitespace that should be preserved in <pre>
		const runsForAnalysis = runsCopy.slice();
		stripTrailingBreaks(runsForAnalysis);

		const visibleTextRuns = runsForAnalysis.filter(r => r && !r.type && typeof r.text === 'string' && /\S/.test(r.text));
		const hasLineBreaks = runsForAnalysis.some(r => r && r.type === 'br');

		// Only promote to headings using explicit size mapping:
		// - Not a list/table and no line breaks
		// - All visible runs share the same font size
		// - That size exists in headingSizeMapHalfPoints
		if (!headingLevel && !parState.isListItem && !parState.inTable && !hasLineBreaks && visibleTextRuns.length) {
			const sizes = [];
			let allHaveSize = true;
			for (const r of visibleTextRuns) {
				const fs = r?.state?.fontSizeHalfPoints;
				if (typeof fs !== 'number') {
					allHaveSize = false;
					break;
				}
				sizes.push(fs);
			}
			if (allHaveSize) {
				const unique = new Set(sizes);
				if (unique.size === 1) {
					const onlySize = sizes[0];
					const lvl = opt.headingSizeMapHalfPoints?.[onlySize];
					if (lvl && lvl >= 1 && lvl <= 6) headingLevel = lvl;
				}
			}
		}

		const blockTag = headingLevel ? `h${Math.max(1, Math.min(6, headingLevel))}` : 'p';

		const styles = [];
		if (parState.align) styles.push(`text-align: ${parState.align}`);

		const attrs = [];
		if (styles.length) attrs.push(`style="${styles.join('; ')}"`);
		if (parState.dir) attrs.push(`dir="${parState.dir}"`);
		const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';

		// For headings, avoid duplicating <strong>
		let runsForRender = runsCopy;
		if (blockTag.startsWith('h')) {
			runsForRender = runsForRender.map(r => r.type ? r : ({ ...r, state: { ...r.state, bold: false } }));
		}

		// Decide if this paragraph should be rendered as <pre> (monospaced)
		let isPre = false;
		if (blockTag === 'p') {
			const hasMonospacedFont = visibleTextRuns.some(r => {
				const fname = (r?.state?.fontNameRaw || r?.state?.fontName || '').toLowerCase();
				return fname.includes('monospaced');
			});
			if (hasMonospacedFont) isPre = true;
		}

		let inner;
		if (isPre) {
			// Preserve whitespace and line breaks: do not strip trailing breaks; map <br> runs to '\n'
			inner = runsForRender.map(r => {
				if (r && r.type === 'br') return '\n';
				return runToHTML(r);
			}).join('');
			// Avoid emitting an extra trailing newline in <pre> blocks
			inner = inner.replace(/\n+$/, '');
			return `<pre${attrStr}>${inner}</pre>`;
		} else {
			// For non-pre content, strip trailing breaks/whitespace to avoid spurious empties
			const tmp = runsForRender.slice();
			stripTrailingBreaks(tmp);
			inner = tmp.map(runToHTML).join('');
			return `<${blockTag}${attrStr}>${inner}</${blockTag}>`;
		}
	}

	function runToHTML(run) {
		if (run.type === 'br') return '<br>';
		const s = run.state;
		let html = escHtml(run.text);
		let open = '';
		let close = '';

		if (s.href) {
			open += `<a href="${escHtml(s.href)}">`;
			close = `</a>` + close;
		}

		const fgRaw = (typeof s.color === 'string') ? s.color : null;
		const bgRaw = (typeof s.background === 'string') ? s.background : null;
		const bothDefault = (fgRaw && bgRaw && fgRaw.toLowerCase() === '#000000' && bgRaw.toLowerCase() === '#ffffff');
		const fg = bothDefault ? null : fgRaw;
		const bg = bothDefault ? null : bgRaw;

		// Combine color and background into a single span to reduce nesting
		const styleSpan = [];
		if (bg) styleSpan.push(`background-color: ${bg}`);
		if (fg) styleSpan.push(`color: ${fg}`);
		if (styleSpan.length) {
			open += `<span style="${styleSpan.join('; ')}">`;
			close = `</span>` + close;
		}

		if (s.underline) {
			const style = s.underlineColor ? ` style="text-decoration-color: ${s.underlineColor};"` : '';
			open += `<u${style}>`;
			close = `</u>` + close;
		}
		if (s.strike) {
			open += `<span style="text-decoration: line-through">`;
			close = `</span>` + close;
		}
		if (s.bold) {
			open += `<strong>`;
			close = `</strong>` + close;
		}
		if (s.italic) {
			open += `<em>`;
			close = `</em>` + close;
		}
		if (s.superscript) {
			open += `<sup>`;
			close = `</sup>` + close;
		} else if (s.subscript) {
			open += `<sub>`;
			close = `</sub>` + close;
		}

		return open + html + close;
	}

	// -----------------------------
	// List helpers (centralized)
	// -----------------------------
	const blocks = [];
	function appendBlock(html) { blocks.push(html); }

	let listStack = []; // [{type:'ul'|'ol', htmlItems:[], level}]
	function openList(type, level) { listStack.push({ type, htmlItems: [], level }); }
	function appendListItem(html) {
		if (!listStack.length) return;
		listStack[listStack.length - 1].htmlItems.push(`<li>${html}</li>`);
	}
	function appendNestedListToLastItem(html) {
		if (!listStack.length) {
			appendBlock(html);
			return;
		}
		const parent = listStack[listStack.length - 1];
		if (!parent.htmlItems.length) {
			parent.htmlItems.push(`<li>${html}</li>`);
			return;
		}
		const lastIdx = parent.htmlItems.length - 1;
		parent.htmlItems[lastIdx] = parent.htmlItems[lastIdx].replace(/<\/li>$/, html + '</li>');
	}
	function closeListUntil(level) {
		while (listStack.length && listStack[listStack.length - 1].level > level) {
			const list = listStack.pop();
			const tag = list.type === 'ol' ? 'ol' : 'ul';
			if (!list.htmlItems.length) continue;
			const html = `<${tag}>${list.htmlItems.join('')}</${tag}>`;
			if (listStack.length) appendNestedListToLastItem(html);
			else appendBlock(html);
		}
	}
	function ensureListLevel(type, level) {
		if (!level || level < 1) level = 1;
		if (listStack.length && listStack[listStack.length - 1].level === level && listStack[listStack.length - 1].type !== type) {
			closeListUntil(level - 1);
		}
		while (listStack.length && listStack[listStack.length - 1].level > level) {
			closeListUntil(level);
		}
		let cur = listStack.length ? listStack[listStack.length - 1].level : 0;
		while (cur < level) {
			openList(type, cur + 1);
			cur++;
		}
	}

	// -----------------------------
	// Parsing context and state
	// -----------------------------
	const decoder = new Decoder();

	const colorTable = []; // index -> {r,g,b, hex} or {auto:true, hex:null}
	const fontTable = {};  // index -> {name, charset}

	const defaultTextState = {
		bold: false,
		italic: false,
		underline: false,
		underlineColor: null,
		strike: false,
		superscript: false,
		subscript: false,
		color: null,
		background: null,
		fontIndex: null,
		fontName: null,
		fontNameRaw: null,
		fontSizeHalfPoints: 24,
		href: null
	};
	function cloneTextState(s) { return { ...s }; }

	let textState = cloneTextState(defaultTextState);

	let paragraphState = {
		align: null,
		dir: null,
		headingLevel: null,
		isListItem: false,
		listType: null, // 'ul' | 'ol'
		listLevel: null, // 1-based
		inTable: false
	};

	// Runs for current paragraph
	let currentParagraphRuns = [];

	// Table builder (created lazily)
	let table = null;

	// Destinations and flags
	let skipDestination = false;
	let inField = false;
	let pendingHyperlink = null; // { href }
	let inFldinst = false;
	let inFldrslt = false;
	let fldinstBuffer = '';
	const fldrsltGroupLevels = [];
	const fldrsltRunsStartIdx = [];

	let inListText = 0;
	let markerBuffer = '';

	// Group stack
	const stack = [];

	function pushTextRun(text) {
		// Apply href within fldrslt
		if (inFldrslt && pendingHyperlink && pendingHyperlink.href && !textState.href) {
			textState.href = pendingHyperlink.href;
		}
		// If a table exists but no cell is open, we are outside the table. Mark for flush,
		// but do NOT drop whitespace — it may belong to the following paragraph (e.g., code/pre).
		if (table && !table.curCell) {
			table.pendingFlush = true;
		}

		const last = currentParagraphRuns[currentParagraphRuns.length - 1];
		if (last && !last.type && statesEqual(last.state, textState)) {
			last.text += text;
			return;
		}
		currentParagraphRuns.push({ text, state: cloneTextState(textState) });
	}

	function pushBreak() {
		// If a table exists but no cell is open, we're outside the table.
		// Mark the table to flush, but preserve the break for the following paragraph.
		if (table && !table.curCell) {
			table.pendingFlush = true;
		}
		currentParagraphRuns.push({ type: 'br' });
	}

	function canEmit() {
		return !skipDestination && inListText === 0;
	}

	function inferCurrentListType(defaultType = 'ul') {
		const marker = (markerBuffer || '').trimStart();
		if (/^[0-9]{1,3}[.)](?:\s|\t)?/.test(marker)) return 'ol';
		if (/^[\u2022\u00B7\u2043\-\u2012\u2013\u2014](?:\s|\t)?/.test(marker)) return 'ul';

		let combined = '';
		for (const r of currentParagraphRuns) {
			if (r && !r.type && typeof r.text === 'string') {
				combined += r.text;
				if (combined.length > 64) break;
			}
		}
		combined = combined.trimStart();
		if (/^[0-9]{1,3}[.)]\s*/.test(combined)) return 'ol';
		if (/^[\u2022\u00B7\u2043\-\u2012\u2013\u2014]\s*/.test(combined)) return 'ul';

		const priorType = listStack.length ? listStack[listStack.length - 1].type : null;
		return priorType || defaultType;
	}

	function coerceParagraphToListItemIfMarkerLeaked() {
		if (!currentParagraphRuns.length) return null;
		let combined = '';
		for (const r of currentParagraphRuns) {
			if (r && !r.type && typeof r.text === 'string') {
				combined += r.text;
				if (combined.length > 50) break;
			}
		}
		let toStripLen = 0;
		let isNumbered = false;

		const bulletClass = '[\\u2022\\u00B7\\u2043\\-\\u2012\\u2013\\u2014]';
		let mNum = new RegExp(`^\\s*${bulletClass}?\\s*([0-9]{1,3})([.)])\\s*`).exec(combined);
		if (mNum) {
			isNumbered = true;
			toStripLen = mNum[0].length;
		} else {
			let mBul = new RegExp(`^\\s*(${bulletClass})\\s*`).exec(combined);
			if (!mBul) return null;
			toStripLen = mBul[0].length;
		}

		let listType = isNumbered ? 'ol' : (listStack.length ? listStack[listStack.length - 1].type : 'ul');
		const inferredLevel = isNumbered ? 1 : (listStack.length ? listStack[listStack.length - 1].level : 1);

		// Strip across runs
		let remaining = toStripLen;
		for (const r of currentParagraphRuns) {
			if (!remaining) break;
			if (!r || r.type || typeof r.text !== 'string') continue;
			if (r.text.length <= remaining) {
				remaining -= r.text.length;
				r.text = '';
			} else {
				r.text = r.text.slice(remaining);
				remaining = 0;
			}
		}
		while (currentParagraphRuns.length && currentParagraphRuns[0] && !currentParagraphRuns[0].type && currentParagraphRuns[0].text === '') {
			currentParagraphRuns.shift();
		}

		return { listType, listLevel: inferredLevel };
	}

	function finalizeListItemIfAny() {
		if (!paragraphState.isListItem) return false;

		// Determine if we know the list type; avoid defaulting to UL when unknown
		const hasMarker = (markerBuffer || '').trim().length > 0;
		const typeKnown = paragraphState.listType || (hasMarker ? inferCurrentListType(null) : null);

		stripLeadingBulletGlyphs(currentParagraphRuns);
		stripTrailingBreaks(currentParagraphRuns);

		const itemHtml = makeParagraphHTML(currentParagraphRuns, paragraphState);
		const itemIsEmpty = itemHtml.replace(/<[^>]+>/g, '').trim() === '';

		// If we don't know the list type yet and the item has no content, don't open a list prematurely
		if (!typeKnown && itemIsEmpty) {
			currentParagraphRuns = [];
			return false;
		}

		const lvl = paragraphState.listLevel || 1;
		const typeToUse = typeKnown || inferCurrentListType('ul');
		ensureListLevel(typeToUse, lvl);

		currentParagraphRuns = [];
		// Preserve empty list item as an empty paragraph (no <br>)
		const finalHtml = itemIsEmpty ? '<p></p>' : itemHtml;
		appendListItem(finalHtml);
		return true;
	}

	function coerceAndFinalizeListItemIfMarkerLeaked() {
		const coerced = coerceParagraphToListItemIfMarkerLeaked();
		if (!coerced) return false;
		paragraphState.isListItem = true;
		paragraphState.listType = coerced.listType;
		paragraphState.listLevel = coerced.listLevel || 1;
		return finalizeListItemIfAny();
	}

	function flushNonListParagraphOrDefer() {
		if (listStack.length) closeListUntil(0);
		if (currentParagraphRuns.length) flushParagraph();
	}

	function flushParagraph() {
		// If a pending table exists and we're about to emit a non-table paragraph, flush table first
		if (table && table.pendingFlush) {
			table.flush();
		}
		if (currentParagraphRuns.length) {
			if (paragraphState.isListItem) {
				// Should not reach here normally as list items are handled elsewhere
				finalizeListItemIfAny();
			} else {
				const html = makeParagraphHTML(currentParagraphRuns, paragraphState);
				// Treat <pre> as non-empty even if it contains only whitespace
				let isEmpty = html.replace(/<[^>]+>/g, '').trim() === '';
				if (/^<pre\b/i.test(html)) isEmpty = false;
				// Preserve empty paragraphs without <br>
				const outHtml = isEmpty ? '<p></p>' : html;
				if (listStack.length) closeListUntil(0);
				appendBlock(outHtml);
				currentParagraphRuns = [];
			}
		}
		paragraphState = {
			align: null,
			dir: null,
			headingLevel: null,
			isListItem: false,
			listType: null,
			listLevel: null,
			inTable: false
		};
		markerBuffer = '';
	}

	// Append any pending paragraph runs into the current table cell as a <p> before closing cells/rows
	function appendPendingParagraphToCurrentCell() {
		if (!table || !table.curCell) return;
		if (!currentParagraphRuns.length) return;
		const html = makeParagraphHTML(currentParagraphRuns, paragraphState);
		const isEmpty = html.replace(/<[^>]+>/g, '').trim() === '';
		currentParagraphRuns = [];
		// Remove all empty paragraphs inside table cells
		if (isEmpty) return;
		table.append(html);
	}

	// Shared helper for background setters (highlight/cb)
	function setBackgroundByColorIndex(arg) {
		if (arg === null) return;
		if (arg === 0) textState.background = null;
		else textState.background = colorTable[arg]?.hex || null;
	}

	// Helper to DRY paragraph boundary handling (used by \par and \pard)
	function handleParagraphBoundary() {
		if (skipDestination) return;
		if (!finalizeListItemIfAny()) {
			if (!paragraphState.isListItem && !paragraphState.inTable) {
				if (!coerceAndFinalizeListItemIfMarkerLeaked()) {
					flushNonListParagraphOrDefer();
				}
			} else if (table) {
				if (table.curCell) {
					const html = makeParagraphHTML(currentParagraphRuns, paragraphState);
					currentParagraphRuns = [];
					// Treat <pre> as non-empty even if whitespace
					let isEmpty = html.replace(/<[^>]+>/g, '').trim() === '';
					if (/^<pre\b/i.test(html)) isEmpty = false;
					// Remove all empty paragraphs inside table cells
					if (isEmpty) {
						return;
					}
					table.append(html);
				} else {
					// Between table rows: ignore empty paragraph markers; flush only if there's real content
					if (currentParagraphRuns.length) {
						table.pendingFlush = true;
						flushParagraph();
					}
				}
			} else {
				flushParagraph();
			}
		}
		paragraphState.isListItem = false;
		paragraphState.listType = null;
		paragraphState.listLevel = null;
		paragraphState.inTable = false;
		markerBuffer = '';
	}

	// -----------------------------
	// Tokenization-lite loop with table-driven handlers
	// -----------------------------
	const src = rtf;
	let i = 0;
	const peek = () => src[i];
	const next = () => src[i++];
	const eof = () => i >= src.length;

	function parseHexByte() {
		const a = next();
		const b = next();
		if (a && b && /[0-9a-fA-F]/.test(a) && /[0-9a-fA-F]/.test(b)) {
			return parseInt(a + b, 16);
		}
		return null;
	}

	function startGroup() {
		stack.push({
			state: cloneTextState(textState),
			skipDestination,
			inField,
			pendingHyperlink,
			fldinstBuffer,
			ucSkip: decoder.ucSkip,
			pendingSkip: decoder.pendingSkip,
			paragraphState: { ...paragraphState },
			inListText,
			inFldinst,
			inFldrslt
		});
	}

	function endGroup() {
		const frame = stack.pop();
		if (!frame) return;

		const closedDepth = stack.length + 1;

		if (fldrsltGroupLevels.length && fldrsltGroupLevels[fldrsltGroupLevels.length - 1] === closedDepth) {
			const startIdx = fldrsltRunsStartIdx.pop();
			fldrsltGroupLevels.pop();
			inFldrslt = false;
			if (pendingHyperlink && pendingHyperlink.href != null && startIdx != null && startIdx >= 0) {
				for (let k = startIdx; k < currentParagraphRuns.length; k++) {
					const r = currentParagraphRuns[k];
					if (r && !r.type && r.state) r.state.href = r.state.href || pendingHyperlink.href;
				}
			}
		}

		const prevInListText = inListText;

		skipDestination = frame.skipDestination;
		decoder.ucSkip = frame.ucSkip;
		decoder.pendingSkip = frame.pendingSkip;
		textState = frame.state;

		inListText = frame.inListText;
		inField = frame.inField;
		inFldinst = frame.inFldinst;
		inFldrslt = frame.inFldrslt;

		if (fieldGroupLevels.length && fieldGroupLevels[fieldGroupLevels.length - 1] === closedDepth) {
			fieldGroupLevels.pop();
			inField = false;
			inFldinst = false;
			inFldrslt = false;
			pendingHyperlink = null;
			fldinstBuffer = '';
			textState.href = null;
		}

		if ((prevInListText > inListText) && markerBuffer && !paragraphState.isListItem) {
			paragraphState.isListItem = true;
			paragraphState.listType = inferCurrentListType();
			if (!paragraphState.listLevel) paragraphState.listLevel = 1;
		}

		// Table flush handled when needed (no special action here)
	}

	const fieldGroupLevels = [];

	const handlers = {
		// Paragraphs
		par: () => { handleParagraphBoundary(); },
		pard: () => {
			handleParagraphBoundary();
			// Additionally reset paragraph-level styles for \pard
			paragraphState.align = null;
			paragraphState.dir = null;
			paragraphState.headingLevel = null;
		},
		line: () => { if (canEmit()) pushBreak(); },
		tab: () => {
			if (inListText > 0) markerBuffer += '\t';
			else if (canEmit()) pushTextRun('\t');
		},

		// Text styles
		b: (arg) => { textState.bold = arg === null || arg !== 0; },
		i: (arg) => { textState.italic = arg === null || arg !== 0; },
		ul: (arg) => { textState.underline = arg === null || arg !== 0; if (!textState.underline) textState.underlineColor = null; },
		ulnone: () => { textState.underline = false; textState.underlineColor = null; },
		ulc: (arg) => { if (arg !== null && colorTable[arg]?.hex) { textState.underline = true; textState.underlineColor = colorTable[arg].hex; } },
		strike: (arg) => { textState.strike = arg === null || arg !== 0; },
		striked: (arg) => { textState.strike = arg === null || arg !== 0; },
		strikedl: (arg) => { textState.strike = arg === null || arg !== 0; },

		// Sup/Sub
		super: () => { textState.superscript = true; textState.subscript = false; },
		sub: () => { textState.superscript = false; textState.subscript = true; },
		nosupersub: () => { textState.superscript = false; textState.subscript = false; },

		// Colors
		cf: (arg) => {
			if (arg === null) return;
			if (arg === 0) textState.color = null;
			else textState.color = colorTable[arg]?.hex || null;
		},
		highlight: (arg) => { setBackgroundByColorIndex(arg); },
		cb: (arg) => { setBackgroundByColorIndex(arg); },

		// Font
		f: (arg) => {
			if (arg === null) return;
			textState.fontIndex = arg;
			const f = fontTable[arg];
			if (f) {
				textState.fontName = (f.name || '').toLowerCase();
				textState.fontNameRaw = f.name || null;
			}
		},
		fs: (arg) => { if (arg !== null) textState.fontSizeHalfPoints = arg; },

		// Alignment
		ql: () => { paragraphState.align = 'left'; },
		qr: () => { paragraphState.align = 'right'; },
		qc: () => { paragraphState.align = 'center'; },
		qj: () => { paragraphState.align = 'justify'; },

		// Direction
		rtlpar: () => { paragraphState.dir = 'rtl'; },
		ltrpar: () => { paragraphState.dir = 'ltr'; },

		// Heading via outline
		outlinelevel: (arg) => {
			if (arg !== null) paragraphState.headingLevel = Math.max(1, Math.min(6, arg));
		},

		// Lists
		ls: (arg) => {
			if (arg === null) return;
			const newIsItem = arg > 0;
			if (!skipDestination && newIsItem && paragraphState.isListItem && currentParagraphRuns.length) {
				finalizeListItemIfAny();
				paragraphState.align = null;
				paragraphState.dir = null;
				paragraphState.headingLevel = null;
			}
			paragraphState.isListItem = newIsItem;
			if (newIsItem) markerBuffer = '';
			if (!paragraphState.isListItem) paragraphState.listType = null;
		},
		ilvl: (arg) => { if (arg !== null) paragraphState.listLevel = (arg >= 0 ? arg + 1 : 1); },
		// When a new \listtext group starts, finalize the current list item (if any) so that
		// multiple items within a single paragraph don't collapse into one <li>.
		listtext: () => {
			if (!skipDestination) {
				if (paragraphState.isListItem && currentParagraphRuns.length) {
					// Finish the previous list item before capturing the next marker
					finalizeListItemIfAny();
					// Reset paragraph-level styles for the new item
					paragraphState.align = null;
					paragraphState.dir = null;
					paragraphState.headingLevel = null;
					// Keep the current list level/type; they may be inferred again after marker parsing
				} else if (!paragraphState.isListItem) {
					// Ensure we're in list item mode if a marker appears without prior \ls
					paragraphState.isListItem = true;
					if (!paragraphState.listLevel) paragraphState.listLevel = 1;
				}
				// Clear marker buffer for the incoming marker text
				markerBuffer = '';
			}
			inListText++;
		},

		// Hyperlinks
		field: () => {
			inField = true;
			fieldGroupLevels.push(stack.length);
			pendingHyperlink = null;
			fldinstBuffer = '';
			inFldinst = false;
			inFldrslt = false;
		},
		fldinst: () => {
			skipDestination = false;
			fldinstBuffer = '';
			inFldinst = true;
		},
		fldrslt: () => {
			if (!pendingHyperlink || !pendingHyperlink.href) {
				const hrefFallback = parseHrefFromFldinstText(fldinstBuffer);
				if (hrefFallback) pendingHyperlink = { href: hrefFallback };
			}
			if (pendingHyperlink?.href) {
				textState.href = pendingHyperlink.href;
			}
			fldrsltGroupLevels.push(stack.length);
			fldrsltRunsStartIdx.push(currentParagraphRuns.length);
			inFldrslt = true;
			inFldinst = false;
			skipDestination = false;
		},

		// Unicode and fallback
		u: (arg) => {
			if (arg === null) return;
			const code = arg < 0 ? arg + 65536 : arg;
			const ch = (code === 0x2028 || code === 0x2029) ? '\n' : String.fromCharCode(code);
			if (inListText > 0) {
				if (code === 0x2028 || code === 0x2029) markerBuffer += '\n';
				else markerBuffer += ch;
				decoder.addPendingSkip(decoder.ucSkip);
				return;
			}
			if (canEmit()) {
				if (code === 0x2028 || code === 0x2029) pushBreak();
				else pushTextRun(ch);
			}
			decoder.addPendingSkip(decoder.ucSkip);
		},
		uc: (arg) => { if (arg !== null) decoder.setUc(arg); },

		// Special characters
		emdash: () => {
			if (inListText > 0) markerBuffer += '\u2014';
			else if (canEmit()) pushTextRun('\u2014');
		},
		endash: () => {
			if (inListText > 0) markerBuffer += '\u2013';
			else if (canEmit()) pushTextRun('\u2013');
		},
		lquote: () => {
			if (inListText > 0) markerBuffer += '\u2018';
			else if (canEmit()) pushTextRun('\u2018');
		},
		rquote: () => {
			if (inListText > 0) markerBuffer += '\u2019';
			else if (canEmit()) pushTextRun('\u2019');
		},
		ldblquote: () => {
			if (inListText > 0) markerBuffer += '\u201C';
			else if (canEmit()) pushTextRun('\u201C');
		},
		rdblquote: () => {
			if (inListText > 0) markerBuffer += '\u201D';
			else if (canEmit()) pushTextRun('\u201D');
		},

		// Horizontal rule
		page: () => {
			if (skipDestination) return;
			flushParagraph();
			appendBlock('<hr>');
		},

		// Tables
		trowd: () => {
			// Flush any non-table paragraph content before starting a table
			if (currentParagraphRuns.length && !paragraphState.inTable) {
				flushParagraph();
			}
			if (!table) table = new TableBuilder(appendBlock);
			// Starting a new row continues the current table. Do NOT flush paragraphs here,
			// and cancel any deferred table flush from the previous non-last row.
			if (table) table.pendingFlush = false;
			table.startRow();
		},
		row: () => {
			if (!table) return;
			// Flush any pending paragraph content into the current cell before ending the row
			appendPendingParagraphToCurrentCell();
			table.endRow();
			table.flushIfLast();
		},
		cell: () => {
			if (table) {
				// Ensure pending paragraph runs are appended to the cell before closing it
				appendPendingParagraphToCurrentCell();
				table.endCell();
			}
		},
		cellx: () => {
			if (!table) table = new TableBuilder(appendBlock);
			if (!table.curCell) {
				table.startCell();
				// Start fresh paragraph buffer for this cell
				currentParagraphRuns = [];
			}
		},
		lastrow: () => { if (table) table.markLastRow(); },
		clcbpat: (arg) => {
			if (table && arg !== null && colorTable[arg]?.hex) table.setCellBackground(colorTable[arg].hex);
		},
		intbl: () => {
			// If we are transitioning from non-table to table, flush any existing paragraph first
			if (!paragraphState.inTable && currentParagraphRuns.length) {
				flushParagraph();
			}
			paragraphState.inTable = true;
			if (!table) table = new TableBuilder(appendBlock);
			if (!table.curCell) table.startCell();
			if (table) table.pendingFlush = false;
		},

		// Pictures (skip)
		pict: () => { skipDestination = true; },

		// Color table
		colortbl: () => {
			// Parse inline until matching }
			let r = 0, g = 0, b = 0;
			let sawAny = false;
			while (!eof()) {
				const c = next();
				if (c === '}') { i--; break; }
				if (c === '\\') {
					let w = '';
					while (!eof() && /[a-zA-Z]/.test(peek())) w += next();
					let n = '';
					let neg = false;
					if (peek() === '-') { neg = true; next(); }
					while (!eof() && /[0-9]/.test(peek())) n += next();
					if (peek() === ' ') next();
					const val = n ? (neg ? -parseInt(n, 10) : parseInt(n, 10)) : null;
					if (w === 'red' && val !== null) { r = val; sawAny = true; }
					else if (w === 'green' && val !== null) { g = val; sawAny = true; }
					else if (w === 'blue' && val !== null) { b = val; sawAny = true; }
				} else if (c === ';') {
					if (!sawAny) colorTable.push({ auto: true, hex: null });
					else colorTable.push({ r, g, b, hex: rgbToHex(r || 0, g || 0, b || 0) });
					r = g = b = 0;
					sawAny = false;
				}
			}
		},

		// Font table
		fonttbl: () => {
			let nesting = 1;
			while (!eof() && nesting > 0) {
				const c = next();
				if (c === '{') {
					nesting++;
					// grouped font entry
					let fIdx = null;
					let name = '';
					let fCharset = null;
					while (!eof()) {
						const c2 = next();
						if (c2 === '\\') {
							let w = '';
							while (!eof() && /[a-zA-Z]/.test(peek())) w += next();
							let n = '';
							let neg = false;
							if (peek() === '-') { neg = true; next(); }
							while (!eof() && /[0-9]/.test(peek())) n += next();
							if (peek() === ' ') next();
							if (w === 'f') fIdx = n ? (neg ? -parseInt(n, 10) : parseInt(n, 10)) : null;
							else if (w === 'fcharset') fCharset = n ? (neg ? -parseInt(n, 10) : parseInt(n, 10)) : null;
						} else if (c2 === ';') {
							break;
						} else if (c2 === '}') {
							nesting--;
							break;
						} else {
							name += c2;
						}
					}
					if (fIdx !== null) {
						const raw = (name || '').trim();
						fontTable[fIdx] = { name: raw, charset: fCharset };
					}
				} else if (c === '\\') {
					// flat entry
					let fIdx = null;
					let fCharset = null;
					function readCtrl() {
						let w = '';
						while (!eof() && /[a-zA-Z]/.test(peek())) w += next();
						let nStr = '';
						let neg = false;
						if (peek() === '-') { neg = true; next(); }
						while (!eof() && /[0-9]/.test(peek())) nStr += next();
						if (peek() === ' ') next();
						const num = nStr ? (neg ? -parseInt(nStr, 10) : parseInt(nStr, 10)) : null;
						return { w, num };
					}
					let { w, num } = readCtrl();
					if (w === 'f') fIdx = num;
					else if (w === 'fcharset') fCharset = num;
					while (!eof() && peek() === '\\') {
						next();
						const r = readCtrl();
						if (r.w === 'f') fIdx = r.num;
						else if (r.w === 'fcharset') fCharset = r.num;
					}
					let name = '';
					while (!eof()) {
						const c3 = next();
						if (c3 === ';') break;
						if (c3 === '}') { nesting--; break; }
						name += c3;
					}
					if (fIdx !== null) {
						const raw = (name || '').trim();
						fontTable[fIdx] = { name: raw, charset: fCharset };
					}
				} else if (c === '}') {
					nesting--;
				}
			}
		}
	};

	// -----------------------------
	// Core parse loop
	// -----------------------------
	while (!eof()) {
		const ch = next();

		if (ch === '{') {
			// Do not carry ASCII-fallback skip across group boundaries
			if (decoder.pendingSkip > 0) decoder.pendingSkip = 0;
			startGroup();
			continue;
		}
		if (ch === '}') {
			// Do not carry ASCII-fallback skip across group boundaries
			if (decoder.pendingSkip > 0) decoder.pendingSkip = 0;
			endGroup();
			continue;
		}

		if (ch === '\\') {
			const c2 = peek();
			// Prevent pending ASCII skip (from \uN) from leaking through control words,
			// except when it's a hex fallback sequence (\'hh), which we must still skip.
			if (decoder.pendingSkip > 0 && c2 !== "'") decoder.pendingSkip = 0;

			if (c2 === '\\' || c2 === '{' || c2 === '}') {
				next();
				if (inListText > 0) markerBuffer += c2;
				else if (canEmit()) pushTextRun(c2);
				continue;
			}

			// parse control word/symbol
			let word = '';
			let hasArg = false;
			let negative = false;
			let numStr = '';

			while (!eof()) {
				const p = peek();
				if (/[a-zA-Z]/.test(p)) word += next();
				else break;
			}
			if (!eof()) {
				if (peek() === '-') { negative = true; next(); }
				let sawDigit = false;
				while (!eof() && /[0-9]/.test(peek())) { sawDigit = true; numStr += next(); }
				if (sawDigit) hasArg = true;
			}
			if (peek() === ' ') next();
			const arg = hasArg ? (negative ? -parseInt(numStr, 10) : parseInt(numStr, 10)) : null;

			if (word === '') {
				// single-char controls: \'hh, \~, \-, \_, \*, \:, EOL, \t literal
				const sym = peek();
				if (sym === "'") {
					next();
					const bytes = [];
					const first = parseHexByte();
					if (first !== null) bytes.push(first);
					while (!eof() && src[i] === '\\' && src[i + 1] === "'" && /[0-9a-fA-F]/.test(src[i + 2]) && /[0-9a-fA-F]/.test(src[i + 3])) {
						i += 2;
						const b2 = parseHexByte();
						if (b2 !== null) bytes.push(b2);
					}
					if (!bytes.length) continue;

					let decoded = '';
					for (const b of bytes) decoded += decoder.decodeCP1252Byte(b);

					if (inListText > 0) {
						markerBuffer += decoded;
						if (decoder.pendingSkip > 0) decoder.pendingSkip = Math.max(0, decoder.pendingSkip - bytes.length);
					} else if (canEmit()) {
						pushTextRun(decoded);
						if (decoder.pendingSkip > 0) decoder.pendingSkip = Math.max(0, decoder.pendingSkip - bytes.length);
					}
				} else if (sym === ' ') {
					// Literal space control symbol: "\ " inserts a single space
					next();
					if (inListText > 0) markerBuffer += ' ';
					else if (canEmit()) pushTextRun(' ');
				} else if (sym === '~') {
					next();
					if (inListText > 0) markerBuffer += '\u00A0';
					else if (canEmit()) pushTextRun('\u00A0');
				} else if (sym === '-') {
					next();
					if (inListText > 0) markerBuffer += '\u2011';
					else if (canEmit()) pushTextRun('\u2011');
				} else if (sym === '_') {
					next();
					if (inListText > 0) markerBuffer += '\u2011';
					else if (canEmit()) pushTextRun('\u2011');
				} else if (sym === '*') {
					next();
					skipDestination = true;
				} else if (sym === ':') {
					next();
				} else if (sym === '\n' || sym === '\r') {
					next();
					if (canEmit()) pushBreak();
				} else if (sym === '\t') {
					next();
					// Tabs handled via \tab primarily; ignore literal
				} else {
					next();
				}
				continue;
			}

			// Dispatch control word to handler
			const handler = handlers[word];
			if (handler) {
				handler(arg);
			} else {
				// no-op unknown words; special-case fldinst accumulation is handled via handlers.fldinst
			}
			continue;
		}

		// Skip destination content unless we must collect fldinst
		if (skipDestination) continue;

		// Pending ASCII skip after \uN
		if (decoder.consumePendingSkip()) continue;

		// Unicode line/paragraph separators
		if (ch === '\u2028' || ch === '\u2029') {
			if (canEmit()) pushBreak();
			continue;
		}

		// Ignore raw CR/LF/TAB
		if (ch === '\n' || ch === '\r' || ch === '\t') continue;

		if (inFldinst) {
			fldinstBuffer += ch;
			const href = parseHrefFromFldinstText(fldinstBuffer);
			if (href && (!pendingHyperlink || !pendingHyperlink.href)) pendingHyperlink = { href };
			continue;
		}

		if (inListText > 0) { markerBuffer += ch; continue; }

		if (currentParagraphRuns.length === 0 && paragraphState.isListItem) {
			const level = paragraphState.listLevel || 1;
			// Avoid opening a default UL before we know the actual marker/type.
			// Only ensure list level if we already know the type or we have captured a marker.
			const hasMarker = (markerBuffer || '').trim().length > 0;
			const type = paragraphState.listType || (hasMarker ? inferCurrentListType(null) : null);
			if (type) ensureListLevel(type, level);
		}

		if (canEmit()) pushTextRun(ch);
	}

	// Finalization
	if (currentParagraphRuns.length) flushParagraph();
	if (listStack.length) closeListUntil(0);
	if (table && (table.curRow.length || table.rows.length)) {
		// If there is any unflushed content in the current cell, append it before flushing the table
		appendPendingParagraphToCurrentCell();
		table.flush();
	}

	// Join blocks
	const html = blocks.join('');
	return html;
}

export { rtfToHtml };
