/* eslint-env mocha */

import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { AllSelection, EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

import { schema, fromHTML, toHTML } from '../src/core/schema/index.js';
import { dropPaste } from '../src/core/plugins/drop-paste.js';
import { markdownParser } from '../src/core/plugins/markdown-parser.js';

describe('Math paste', () => {
	let dom;
	let view;
	let globals;

	beforeEach(() => {
		globals = { window: global.window, document: global.document };
		dom = new JSDOM('<!doctype html><body></body>');
		global.window = dom.window;
		global.document = dom.window.document;
		view = new EditorView(document.body, {
			state: EditorState.create({ schema, plugins: [markdownParser(), dropPaste({})] }),
			handleScrollToSelection: () => true
		});
	});

	afterEach(() => {
		view.destroy();
		dom.window.close();
		for (let [key, value] of Object.entries(globals)) {
			if (value === undefined) delete global[key];
			else global[key] = value;
		}
	});

	function paste(text, html, shiftKey = false, extraData = {}) {
		let data = { 'text/plain': text, ...extraData };
		if (html) data['text/html'] = html;
		if (shiftKey) {
			view.dom.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
				key: 'Shift', keyCode: 16, shiftKey: true, bubbles: true
			}));
		}
		let event = new dom.window.Event('paste', { bubbles: true, cancelable: true });
		Object.defineProperty(event, 'clipboardData', {
			value: { types: Object.keys(data), files: [], getData: type => data[type] || '' }
		});
		view.dom.dispatchEvent(event);
		if (shiftKey) {
			view.dom.dispatchEvent(new dom.window.KeyboardEvent('keyup', {
				key: 'Shift', keyCode: 16, bubbles: true
			}));
		}
		view.state.doc.check();
		return view.state.doc;
	}

	function mathNodes(doc) {
		let nodes = [];
		doc.descendants((node) => {
			if (node.type.name.startsWith('math_')) nodes.push([node.type.name, node.textContent]);
		});
		return nodes;
	}

	it('renders the forum-shaped HTML while preserving formatting and structure', () => {
		let doc = paste('', String.raw`<h2>Conditions</h2><p><strong>Continuous</strong> \(\kappa_i\).</p>
<p>\[\kappa(x)=\sum_{i=1}^{d}\kappa_i(x_i)\]</p>
<ul><li><em>Finite</em> <a href="https://example.org/">integral</a>.</li></ul>`);
		expect(mathNodes(doc)).to.deep.equal([
			['math_inline', String.raw`\kappa_i`],
			['math_display', String.raw`\kappa(x)=\sum_{i=1}^{d}\kappa_i(x_i)`]
		]);
		expect(doc.child(0).type.name).to.equal('heading');
		expect(doc.childCount).to.equal(4);
		expect(doc.child(1).firstChild.marks[0].type.name).to.equal('strong');
		let item = doc.lastChild.firstChild.firstChild;
		expect(item.firstChild.marks[0].type.name).to.equal('em');
		expect(item.child(2).marks[0].attrs.href).to.equal('https://example.org/');
	});

	it('preserves equations at the clipboard slice boundaries', () => {
		let doc = paste('', String.raw`<p>\(x^2\)</p><p>\[y^2\]</p>`);
		expect(mathNodes(doc)).to.deep.equal([['math_inline', 'x^2'], ['math_display', 'y^2']]);
		expect(doc.childCount).to.equal(2);
		doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text('ab'))]);
		view.updateState(EditorState.create({
			doc, selection: TextSelection.create(doc, 2), plugins: view.state.plugins
		}));
		doc = paste('', String.raw`<p>\(x^2\)</p><p>\[y^2\]</p>`);
		expect(mathNodes(doc)).to.deep.equal([['math_inline', 'x^2'], ['math_display', 'y^2']]);
		expect(doc.firstChild.firstChild.textContent).to.equal('a');
		expect(doc.lastChild.textContent).to.equal('b');
	});

	it('converts inline HTML fragments without paragraph wrappers', () => {
		let doc = paste('', String.raw`<meta charset="utf-8"><span style="color: red">where each \(\kappa_i\) is continuous</span>`);
		expect(mathNodes(doc)).to.deep.equal([['math_inline', String.raw`\kappa_i`]]);
		expect(doc.firstChild.child(1).marks[0].type.name).to.equal('textColor');
		view.updateState(EditorState.create({ schema, plugins: view.state.plugins }));
		doc = paste('', String.raw`<span>\[x\]</span><code>\(y\)</code>`);
		expect(mathNodes(doc)).to.have.length(0);
		expect(doc.textContent).to.equal(String.raw`\[x\]\(y\)`);
	});

	it('converts standalone display math with formatting and line breaks', () => {
		let doc = paste('', String.raw`<p><del><font>\[<br>x^2 +<br>y^2<br>\]</font></del></p>`);
		expect(mathNodes(doc)).to.deep.equal([['math_display', 'x^2 +\ny^2']]);
		expect(doc.childCount).to.equal(1);
	});

	it('keeps code, unmatched delimiters, and escaped delimiters literal', () => {
		let doc = paste('', String.raw`<p><code>\(x\)</code> and \\(y\\), then \(unclosed.</p><pre>\[x\]</pre>`);
		expect(mathNodes(doc)).to.have.length(0);
		expect(doc.firstChild.textContent).to.equal(String.raw`\(x\) and \\(y\\), then \(unclosed.`);
		expect(doc.lastChild.type.name).to.equal('codeBlock');
	});

	it('respects escaped delimiters across formatting boundaries', () => {
		for (let html of [
			String.raw`<p><strong>\</strong>\(x\)</p>`,
			String.raw`<strong>\</strong><span>\(x\)</span>`
		]) {
			view.updateState(EditorState.create({ schema, plugins: view.state.plugins }));
			let doc = paste('', html);
			expect(mathNodes(doc)).to.have.length(0);
			expect(doc.textContent).to.equal(String.raw`\\(x\)`);
		}
	});

	it('preserves equations split across formatting boundaries', () => {
		for (let [html, text, index, mark] of [
			[String.raw`<p>a \(x<strong>y</strong>\) b</p>`, String.raw`a \(xy\) b`, 1, 'strong'],
			[String.raw`<p><em>\(x</em>y\)</p>`, String.raw`\(xy\)`, 0, 'em'],
			[String.raw`<span>a \(x<strong>y</strong>\) b</span>`, String.raw`a \(xy\) b`, 1, 'strong']
		]) {
			view.updateState(EditorState.create({ schema, plugins: view.state.plugins }));
			let doc = paste('', html);
			expect(mathNodes(doc)).to.have.length(0);
			expect(doc.textContent).to.equal(text);
			expect(doc.firstChild.child(index).marks[0].type.name).to.equal(mark);
		}
	});

	it('keeps a stray opener literal before a complete equation', () => {
		for (let html of [
			String.raw`<p>Stray \(a then \(b\) ok</p>`,
			String.raw`<span>Stray \(a then \(b\) ok</span>`,
			String.raw`<p>Stray <strong>\(a</strong> then \(b\) ok</p>`
		]) {
			view.updateState(EditorState.create({ schema, plugins: view.state.plugins }));
			let doc = paste('', html);
			expect(mathNodes(doc)).to.deep.equal([['math_inline', 'b']]);
			expect(doc.textContent).to.equal(String.raw`Stray \(a then b ok`);
		}
		view.updateState(EditorState.create({ schema, plugins: view.state.plugins }));
		let text = String.raw`\[a then \[b\]`;
		let doc = paste('', `<p>${text}</p>`);
		expect(mathNodes(doc)).to.have.length(0);
		expect(doc.textContent).to.equal(text);
	});

	it('respects all code marks recognized by the existing HTML parser', () => {
		let html = ['code', 'tt', 'kbd', 'samp', 'var']
			.map(tag => `<p><${tag}>\\(x\\)</${tag}></p>`).join('');
		html += String.raw`<p><span style="font-family: monospace">\(x\)</span></p>
<p><span style="white-space: pre">\(x\)</span></p>`;
		let doc = paste('', html);
		expect(mathNodes(doc)).to.have.length(0);
		doc.forEach((node) => {
			expect(node.textContent).to.equal(String.raw`\(x\)`);
			expect(node.firstChild.marks[0].type.name).to.equal('code');
		});
	});

	it('preserves literal delimiters and existing equations copied between notes', () => {
		let original = schema.node('doc', null, [schema.node('paragraph', null, [
			schema.text(String.raw`Type \(x\) and \[y\] to enter math. `),
			schema.node('math_inline', null, schema.text('z^2'))
		])]);
		let clipboard = view.serializeForClipboard(original.slice(0, original.content.size));
		expect(paste(clipboard.text, clipboard.dom.innerHTML).eq(original)).to.equal(true);
	});

	it('preserves bare table fragments while converting equations', () => {
		let doc = paste('', String.raw`<tr><td>\(x\)</td><td>\[y^2\]</td></tr>`);
		expect(doc.lastChild.type.name).to.equal('table');
		expect(doc.lastChild.firstChild.childCount).to.equal(2);
		expect(mathNodes(doc)).to.deep.equal([['math_inline', 'x'], ['math_display', 'y^2']]);
	});

	it('leaves non-standalone display delimiters and heading source literal', () => {
		let doc = paste('', String.raw`<h2>Heading \(x\) tail</h2><p>Before \[y^2\] after</p>`);
		expect(mathNodes(doc)).to.have.length(0);
		expect(doc.child(0).textContent).to.equal(String.raw`Heading \(x\) tail`);
		expect(doc.child(1).textContent).to.equal(String.raw`Before \[y^2\] after`);
	});

	it('keeps inline delimiters inside non-standalone display math literal', () => {
		let text = String.raw`Before \[a \(b\) c\] after`;
		for (let html of [
			`<p>${text}</p>`,
			String.raw`<p>Before \[a <strong>\(b\)</strong> c\] after</p>`
		]) {
			view.updateState(EditorState.create({ schema, plugins: view.state.plugins }));
			let doc = paste('', html);
			expect(mathNodes(doc)).to.have.length(0);
			expect(doc.textContent).to.equal(text);
		}
		view.updateState(EditorState.create({ schema, plugins: view.state.plugins }));
		let doc = paste('', String.raw`<p>\(x\) Before \[a <strong>\(b\)</strong> c\] after \(y\)</p>`);
		expect(mathNodes(doc)).to.deep.equal([['math_inline', 'x'], ['math_inline', 'y']]);
		view.updateState(EditorState.create({ schema, plugins: view.state.plugins }));
		doc = paste('', String.raw`<p><code>\[a</code> \(b\) <code>c\]</code></p>`);
		expect(mathNodes(doc)).to.deep.equal([['math_inline', 'b']]);
	});

	it('keeps literal delimiters in HTML copied or exported from Zotero notes', () => {
		let text = String.raw`Type \(x\) and \[y\] to enter math.`;
		for (let html of [
			`<div class="zotero-notes"><div class="zotero-note"><p>${text}</p></div></div>`,
			`<div class='extra zotero-note exported'><p>${text}</p></div>`,
			`<div data-schema-version="${schema.version}"><p>${text}</p></div>`
		]) {
			view.updateState(EditorState.create({ schema, plugins: view.state.plugins }));
			let doc = paste('', html);
			expect(mathNodes(doc)).to.have.length(0);
			expect(doc.textContent).to.equal(text);
		}
	});

	it('respects active inline code and an explicit exit from code formatting', () => {
		let code = schema.marks.code.create();
		let doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text('pre tail', [code]))]);
		view.updateState(EditorState.create({
			doc, selection: TextSelection.create(doc, 4), plugins: view.state.plugins
		}));
		let result = paste('', String.raw`<p>\(x\)</p>`);
		expect(mathNodes(result)).to.have.length(0);
		expect(result.textContent).to.equal(String.raw`pre\(x\) tail`);
		view.updateState(EditorState.create({ schema, plugins: view.state.plugins }));
		view.dispatch(view.state.tr.setStoredMarks([code]));
		expect(mathNodes(paste('', String.raw`<p>\(x\)</p>`))).to.have.length(0);
		view.updateState(EditorState.create({
			doc, selection: TextSelection.create(doc, 4), plugins: view.state.plugins
		}));
		view.dispatch(view.state.tr.setStoredMarks([]));
		expect(mathNodes(paste('', String.raw`<p>\(x\)</p>`))).to.deep.equal([['math_inline', 'x']]);
	});

	it('leaves RTF-only clipboard source on its existing import path', () => {
		let descriptor = Object.getOwnPropertyDescriptor(global, 'navigator');
		try {
			Object.defineProperty(global, 'navigator', { value: { platform: 'MacIntel' }, configurable: true });
			for (let font of ['Menlo', 'Monaco', 'Courier']) {
				view.updateState(EditorState.create({ schema, plugins: view.state.plugins }));
				let text = String.raw`sed \(foo\)`;
				let rtf = String.raw`{\rtf1\ansi{\fonttbl{\f0 ${font};}}\f0 sed \\(foo\\)}`;
				let doc = paste(text, null, false, { 'text/rtf': rtf });
				expect(mathNodes(doc)).to.have.length(0);
				expect(doc.textContent).to.equal(text);
			}
		}
		finally {
			if (descriptor) Object.defineProperty(global, 'navigator', descriptor);
			else delete global.navigator;
		}
	});

	it('handles a large clipboard fragment with unmatched delimiters promptly', () => {
		let text = String.raw`\(`.repeat(40000);
		let doc = paste('', `<p>${text}</p>`);
		expect(mathNodes(doc)).to.have.length(0);
		expect(doc.textContent).to.equal(text);
	});

	it('keeps an existing heading intact when equations are pasted into it', () => {
		let doc = schema.node('doc', null, [schema.node('heading', null, schema.text('Head tail'))]);
		view.updateState(EditorState.create({
			doc, selection: TextSelection.create(doc, 5), plugins: view.state.plugins
		}));
		doc = paste('', String.raw`<p>See \(x\) here</p>`);
		expect(doc.childCount).to.equal(1);
		expect(doc.firstChild.type.name).to.equal('heading');
		expect(doc.textContent).to.equal(String.raw`HeadSee \(x\) here tail`);
	});

	it('converts equations when replacing the entire note', () => {
		view.dispatch(view.state.tr.setSelection(new AllSelection(view.state.doc)));
		let doc = paste('', String.raw`<p>\(x\)</p><p>\[y^2\]</p>`);
		expect(mathNodes(doc)).to.deep.equal([['math_inline', 'x'], ['math_display', 'y^2']]);
	});

	it('keeps annotation text intact when equations are pasted inside it', () => {
		for (let type of ['highlight', 'underline_annotation']) {
			let annotation = { annotationKey: 'TEST1234' };
			let doc = schema.node('doc', null, [schema.node('paragraph', null, [
				schema.node(type, { annotation }, schema.text('Hello world'))
			])]);
			view.updateState(EditorState.create({
				doc, selection: TextSelection.create(doc, 7), plugins: view.state.plugins
			}));
			doc = paste('', String.raw`<p>see \(x\) here</p>`);
			expect(mathNodes(doc)).to.have.length(0);
			expect(doc.firstChild.childCount).to.equal(1);
			expect(doc.firstChild.firstChild.type.name).to.equal(type);
			expect(doc.firstChild.firstChild.attrs.annotation).to.deep.equal(annotation);
			expect(doc.textContent).to.equal(String.raw`Hellosee \(x\) here world`);
		}
	});

	it('preserves list and table structure through saving and reloading', () => {
		let doc = paste('', String.raw`<ul><li><p><strong>Before</strong></p><p>\[x^2\]</p><p><strong>after</strong></p></li></ul>
<table><tr><td><p>\(y\)</p></td><td><p>\[z^2\]</p></td></tr></table>`);
		expect(mathNodes(doc)).to.deep.equal([
			['math_display', 'x^2'], ['math_inline', 'y'], ['math_display', 'z^2']
		]);
		expect(doc.firstChild.firstChild.childCount).to.equal(3);
		let html = toHTML(doc.content, { serializeAttributes: () => ({ 'data-schema-version': schema.version }) });
		expect(fromHTML(html).eq(doc)).to.equal(true);
	});

	it('keeps Shift-pasted HTML and HTML pasted into code blocks literal', () => {
		let doc = paste(String.raw`\(x\)`, String.raw`<p><strong>\(x\)</strong></p>`, true);
		expect(mathNodes(doc)).to.have.length(0);
		expect(doc.textContent).to.equal(String.raw`\(x\)`);
		view.updateState(EditorState.create({
			doc: schema.node('doc', null, [schema.node('codeBlock')]), plugins: view.state.plugins
		}));
		doc = paste(String.raw`\(x\)`, String.raw`<p>\(x\)</p>`);
		expect(doc.firstChild.type.name).to.equal('codeBlock');
		expect(doc.textContent).to.equal(String.raw`\(x\)`);
	});

	it('leaves plain LaTeX source and shell commands on the existing plain-text path', () => {
		let text = String.raw`We set \(x=1\) and pay \$5, i.e. 50\% of
the total \{a\}.
% comment
Next line`;
		let doc = paste(text);
		expect(mathNodes(doc)).to.have.length(0);
		expect(doc.childCount).to.equal(4);
		expect(doc.textBetween(0, doc.content.size, '\n')).to.equal(text);
		view.updateState(EditorState.create({ schema, plugins: view.state.plugins }));
		text = String.raw`sed 's/\(foo\)/\1/'`;
		expect(paste(text).textContent).to.equal(text);
	});
});
