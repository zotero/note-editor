import { Plugin, PluginKey, TextSelection, Selection } from 'prosemirror-state';

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
	deleteTable,
	TableMap
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

		let { $from } = this.view.state.selection;
		for (let i = $from.depth; i >= 0; i--) {
			let node = $from.node(i);
			if(node.type === this.view.state.schema.nodes.table) {
				this.node = node;
			}
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
		let { selection } = state;
		let { from } = selection;
		let { table, table_row, table_cell } = schema.nodes;
		let rowNodes = [];
		for (let i = 0; i < rows; i++) {
			let cellNodes = [];
			for (let j = 0; j < columns; j++) {
				cellNodes.push(table_cell.createAndFill());
			}
			rowNodes.push(table_row.create(null, Fragment.from(cellNodes)));
		}
		let node = table.create(null, Fragment.from(rowNodes));
		let tr = state.tr.replaceSelectionWith(node);
		// Put cursor into table->tr->td->p
		tr.setSelection(new TextSelection(tr.doc.resolve(from + 3)));
		dispatch(tr);
	}

	isTableSelected() {
		let { $from } = this.view.state.selection;
		for (let i = $from.depth; i > 0; i--) {
			let node = $from.node(i);
			if(node.type === schema.nodes.table) {
				return true;
			}
		}
		return false;
	}

	moveCursorTo (pos) {
		let { state, dispatch } = this.view;
		let offset = this.tablePos();
		if (offset) {
			let { tr } = state;
			tr.setSelection(Selection.near(tr.doc.resolve(pos + offset)));
			dispatch(tr);
		}
	}

	tablePos() {
		let { $from } = this.view.state.selection;
		for (let i = $from.depth; i > 0; i--) {
			let node = $from.node(i);
			if (node.type === this.view.state.schema.nodes.table) {
				return $from.start(i);
			}
		}
	}

	getCurrentCellPos() {
		let { $from } = this.view.state.selection;
		let { table_cell, table_header } = this.view.state.schema.nodes;
		for (let i = $from.depth; i >= 0; i--) {
			let node = $from.node(i);
			if (node.type === table_cell || node.type === table_header) {
				return $from.start(i);
			}
		}
	}

	goToNextCell(direction) {
		let { state, dispatch } = this.view;
		if (!this.node) {
			return false;
		}
		let offset = this.tablePos();
		if (!offset) {
			return false;
		}
		let map = TableMap.get(this.node);
		let cellPos = this.getCurrentCellPos();
		let firstCellPos = map.positionAt(0, 0, this.node) + offset + 1;
		let lastCellPos = map.positionAt(map.height - 1, map.width - 1, this.node) + offset + 1;

		if (cellPos === firstCellPos && direction === -1) {
			let pos = map.positionAt(0, 0, this.node);
			this.moveCursorTo(pos);
			addRowBefore(this.view.state, dispatch);
			this.moveCursorTo(pos);
			return true;
		}
		else if (cellPos === lastCellPos && direction === 1) {
			let prevRowPos = map.positionAt(map.height - 1, 0, this.node);
			this.moveCursorTo(prevRowPos);
			addRowAfter(this.view.state, dispatch);
			let nextPos = TableMap.get(this.node).positionAt(map.height, 0, this.node);
			this.moveCursorTo(nextPos);
			return true;
		}
		if (!this.view.hasFocus()) {
			this.view.focus();
		}
		let result = goToNextCell(direction)(state, dispatch);
		if (result) {
			let { state } = this.view;
			dispatch(state.tr.setSelection(Selection.near(state.selection.$from)));
		}
		return result;
	};

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
