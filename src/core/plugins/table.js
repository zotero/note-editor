import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';

import {
	addColumnAfter,
	addColumnBefore,
	deleteColumn,
	addRowAfter,
	addRowBefore,
	deleteRow,
	mergeCells,
	splitCell,
	setCellAttr,
	toggleHeaderRow,
	toggleHeaderColumn,
	toggleHeaderCell,
	goToNextCell,
	deleteTable
} from "prosemirror-tables";

import { schema } from '../schema';
import { removeMarkRangeAtCursor, updateMarkRangeAtCursor } from '../commands';
import { getMarkRangeAtCursor } from '../helpers';
import { refocusEditor } from '../utils';
import { Fragment } from 'prosemirror-model';


class Table {
	constructor(state, options) {
		this.state = { };
		this.options = options;
	}

	update(state, oldState) {
		if (!this.view) {
			return;
		}

		if (oldState && oldState.doc.eq(state.doc) && oldState.selection.eq(state.selection)) {
			return;
		}

		this.state = {};
	}

	insertColumnBefore(pos) {
		let { state, dispatch } = this.view;
		addColumnBefore(state, dispatch);
	}

	insertColumnAfter(pos) {
		let { state, dispatch } = this.view;
		addColumnAfter(state, dispatch);
	}

	deleteColumn(pos) {
		let { state, dispatch } = this.view;
		deleteColumn(state, dispatch);
	}

	insertRowBefore(pos) {
		let { state, dispatch } = this.view;
		addRowBefore(state, dispatch);
	}

	insertRowAfter(pos) {
		let { state, dispatch } = this.view;
		addRowAfter(state, dispatch);
	}

	deleteRow(pos) {
		let { state, dispatch } = this.view;
		deleteRow(state, dispatch);
	}

	mergeCells(pos) {
		let { state, dispatch } = this.view;
		mergeCells(state, dispatch);
	}

	splitCell(pos) {
		let { state, dispatch } = this.view;
		splitCell(state, dispatch);
	}

	toggleHeader(pos) {
		let { state, dispatch } = this.view;
		toggleHeaderCell(state, dispatch);
	}

	deleteTable(pos) {
		let { state, dispatch } = this.view;
		deleteTable(state, dispatch);
	}

	insertTable(rows, columns) {
		let { state, dispatch } = this.view;
		const { table, table_row, table_cell } = schema.nodes;
		const rowNodes = [];
		for (let i = 0; i < rows; i++) {
			const cellNodes = [];
			for (let j = 0; j < columns; j++) {
				cellNodes.push(table_cell.createAndFill());
			}
			rowNodes.push(table_row.create(null, Fragment.from(cellNodes)));
		}
		let tableNode = table.create(null, Fragment.from(rowNodes));
		let tr = state.tr.replaceSelectionWith(tableNode);
		dispatch(tr);
	}

	isTableSelected() {
		const { $from } = this.view.state.selection;
		for (let i = $from.depth; i > 0; i--) {
			const node = $from.node(i);
			if(node.type === schema.nodes.table) {
				return true;
			}
		}
		return false;
	}

	destroy() {

	}
}

export let tableKey = new PluginKey('table');

export function table(options) {
	return new Plugin({
		key: tableKey,
		state: {
			init(config, state) {
				return new Table(state, options);
			},
			apply(tr, pluginState, oldState, newState) {
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = tableKey.getState(view.state);
			pluginState.view = view;
			return {
				update(view, lastState) {
					pluginState.update(view.state, lastState);
				},
				destroy() {
					pluginState.destroy();
				}
			};
		}
	});
}
