'use strict';

import React, { useCallback } from 'react';
import { useLocalization } from '@fluent/react';

import Popup from './popup';
import IconInsertRowAbove from '../../../res/icons/16/insert-row-above.svg';
import IconInsertRowBelow from '../../../res/icons/16/insert-row-below.svg';
import IconInsertColumnRight from '../../../res/icons/16/insert-column-right.svg';
import IconInsertColumnLeft from '../../../res/icons/16/insert-column-left.svg';
import IconDeleteRow from '../../../res/icons/16/delete-row.svg';
import IconDeleteColumn from '../../../res/icons/16/delete-column.svg';
import IconDeleteTable from '../../../res/icons/16/delete-table.svg';

function TablePopup({ parentRef, tableState }) {
	const { l10n } = useLocalization();

	const handleInsertRowBefore = useCallback(() => {
		tableState.insertRowBefore();
	});
	const handleInsertRowAfter = useCallback(() => {
		tableState.insertRowAfter();
	});

	const handleColumnBefore = useCallback(() => {
		tableState.insertColumnBefore();
	});

	const handleColumnAfter = useCallback(() => {
		tableState.insertColumnAfter();
	});

	const handleDeleteColumn = useCallback(() => {
		tableState.deleteColumn();
	});

	const handleDeleteRow = useCallback(() => {
		tableState.deleteRow();
	});

	const handleDeleteTable = useCallback(() => {
		tableState.deleteTable();
	});

	return (
		<Popup className="table-popup" parentRef={parentRef} pluginState={tableState.popup}>
			<button
				title={l10n.getString('note-editor-insert-row-before')}
				onClick={handleInsertRowBefore}
			>
				<div className="icon"><IconInsertRowAbove /></div>
			</button>
			<button
				title={l10n.getString('note-editor-insert-row-after')}
				onClick={handleInsertRowAfter}
			>
				<div className="icon"><IconInsertRowBelow /></div>
			</button>
			<button
				title={l10n.getString('note-editor-insert-column-before')}
				onClick={handleColumnBefore}
			>
				<div className="icon"><IconInsertColumnLeft /></div>
			</button>
			<button
				title={l10n.getString('note-editor-insert-column-after')}
				onClick={handleColumnAfter}
			>
				<div className="icon"><IconInsertColumnRight /></div>
			</button>
			<button
				title={l10n.getString('note-editor-delete-column')}
				onClick={handleDeleteColumn}
			>
				<div className="icon"><IconDeleteColumn /></div>
			</button>
			<button
				title={l10n.getString('note-editor-delete-row')}
				onClick={handleDeleteRow}
			>
				<div className="icon"><IconDeleteRow /></div>
			</button>
			<button
				title={l10n.getString('note-editor-delete-table')}
				onClick={handleDeleteTable}
			>
				<div className="icon"><IconDeleteTable /></div>
			</button>
		</Popup>
	);
}

export default TablePopup;
