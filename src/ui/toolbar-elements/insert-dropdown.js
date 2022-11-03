'use strict';

import React from 'react';
import { useIntl } from 'react-intl';

import { IconInsert, IconImage, IconMath, IconTable } from '../icons';
import Dropdown from './dropdown';

export default function InsertDropdown({ onInsertTable, onInsertMath, onInsertImage }) {
	const intl = useIntl();

	return (
		<Dropdown
			className="insert-dropdown"
			icon={<IconInsert />}
			title={intl.formatMessage({id: 'general.insert'})}
		>
			<button
				className="toolbar-button"
				title={intl.formatMessage({ id: 'noteEditor.insertImage' })}
				onClick={onInsertImage}
				onMouseDown={(event) => event.preventDefault()}
			><IconImage /></button>
			<button
				className="toolbar-button"
				title={intl.formatMessage({ id: 'noteEditor.insertTable' })}
				onClick={onInsertTable }
				onMouseDown={(event) => event.preventDefault()}
			><IconTable /></button>
			<button
				className="toolbar-button"
				title={intl.formatMessage({ id: 'noteEditor.insertMath' })}
				onClick={onInsertMath}
				onMouseDown={(event) => event.preventDefault()}
			><IconMath /></button>
		</Dropdown>
	);
}
