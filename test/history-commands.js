/* global describe, it */

import { expect } from 'chai';
import { schema } from 'prosemirror-schema-basic';
import { history } from 'prosemirror-history';
import {
	inputRules,
	textblockTypeInputRule,
} from 'prosemirror-inputrules';
import { EditorState } from 'prosemirror-state';

import { redoCommand, undoCommand } from '../src/core/history-commands.js';

function createState() {
	let inputRulesPlugin = inputRules({
		rules: [
			textblockTypeInputRule(
				/^(#{1,6}) $/,
				schema.nodes.heading,
				match => ({ level: match[1].length })
			),
		],
	});
	let state = EditorState.create({
		schema,
		plugins: [inputRulesPlugin, history()],
	});
	let dispatch = (transaction) => {
		state = state.apply(transaction);
	};

	return {
		get state() {
			return state;
		},
		dispatch,
		inputRulesPlugin,
	};
}

describe('history commands', function () {
	it('should undo and redo document changes', function () {
		let editor = createState();
		editor.dispatch(editor.state.tr.insertText('text', 1));

		expect(undoCommand(editor.state)).to.equal(true);
		expect(undoCommand(editor.state, editor.dispatch)).to.equal(true);
		expect(editor.state.doc.textContent).to.equal('');
		expect(redoCommand(editor.state)).to.equal(true);
		expect(redoCommand(editor.state, editor.dispatch)).to.equal(true);
		expect(editor.state.doc.textContent).to.equal('text');
	});

	it('should undo the latest input rule before document history', function () {
		let editor = createState();
		editor.dispatch(editor.state.tr.insertText('#', 1));
		let view = {
			get state() {
				return editor.state;
			},
			dispatch: editor.dispatch,
			composing: false,
		};

		expect(editor.inputRulesPlugin.props.handleTextInput(view, 2, 2, ' ')).to.equal(true);
		expect(editor.state.doc.firstChild.type).to.equal(schema.nodes.heading);
		expect(undoCommand(editor.state, editor.dispatch)).to.equal(true);
		expect(editor.state.doc.firstChild.type).to.equal(schema.nodes.paragraph);
		expect(editor.state.doc.textContent).to.equal('# ');
	});
});
