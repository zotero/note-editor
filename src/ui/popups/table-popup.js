'use strict';

import React, { useCallback } from 'react';
import { useIntl } from 'react-intl';

import Popup from './popup';
import IconInsertRowAbove from '../../../res/icons/16/insert-row-above.svg';
import IconInsertRowBelow from '../../../res/icons/16/insert-row-below.svg';
import IconInsertColumnRight from '../../../res/icons/16/insert-column-right.svg';
import IconInsertColumnLeft from '../../../res/icons/16/insert-column-left.svg';
import IconDeleteRow from '../../../res/icons/16/delete-row.svg';
import IconDeleteColumn from '../../../res/icons/16/delete-column.svg';
import IconDeleteTable from '../../../res/icons/16/delete-table.svg';

function TablePopup({ parentRef, tableState }) {
	const intl = useIntl();

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
				title={intl.formatMessage({ id: 'noteEditor.insertRowBefore' })}
				onClick={handleInsertRowBefore}
			>
				<div className="icon"><IconInsertRowAbove /></div>
			</button>
			<button
				title={intl.formatMessage({ id: 'noteEditor.insertRowAfter' })}
				onClick={handleInsertRowAfter}
			>
				<div className="icon"><IconInsertRowBelow /></div>
			</button>
			<button
				title={intl.formatMessage({ id: 'noteEditor.insertColumnBefore' })}
				onClick={handleColumnBefore}
			>
				<div className="icon"><IconInsertColumnLeft /></div>
			</button>
			<button
				title={intl.formatMessage({ id: 'noteEditor.insertColumnAfter' })}
				onClick={handleColumnAfter}
			>
				<div className="icon"><IconInsertColumnRight /></div>
			</button>
			<button
				title={intl.formatMessage({ id: 'noteEditor.deleteColumn' })}
				onClick={handleDeleteColumn}
			>
				<div className="icon"><IconDeleteColumn /></div>
			</button>
			<button
				title={intl.formatMessage({ id: 'noteEditor.deleteRow' })}
				onClick={handleDeleteRow}
			>
				<div className="icon"><IconDeleteRow /></div>
			</button>
			<button
				title={intl.formatMessage({ id: 'noteEditor.deleteTable' })}
				onClick={handleDeleteTable}
			>
				<div className="icon"><IconDeleteTable /></div>
			</button>
		</Popup>
	);
}

export default TablePopup;
