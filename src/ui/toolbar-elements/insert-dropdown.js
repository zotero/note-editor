'use strict';

import React from 'react';
import { useIntl } from 'react-intl';

import Dropdown from './dropdown';

import IconInsert from '../../../res/icons/20/plus.svg';
import IconImage from '../../../res/icons/20/image.svg';
import IconMath from '../../../res/icons/20/math.svg';
import IconTable from '../../../res/icons/20/table.svg';

export default function InsertDropdown({ isAttachmentNote, onInsertTable, onInsertMath, onInsertImage }) {
	const intl = useIntl();

	return (
		<Dropdown
			className="insert-dropdown"
			icon={<IconInsert/>}
			title={intl.formatMessage({id: 'general.insert'})}
		>
			{ !isAttachmentNote && <button
				role="menuitem"
				className="toolbar-button"
				title={intl.formatMessage({ id: 'noteEditor.insertImage' })}
				onClick={onInsertImage}
				onMouseDown={(event) => event.preventDefault()}
			><IconImage /></button> }
			<button
				role="menuitem"
				className="toolbar-button"
				title={intl.formatMessage({ id: 'noteEditor.insertTable' })}
				onClick={onInsertTable }
				onMouseDown={(event) => event.preventDefault()}
			><IconTable /></button>
			<button
				role="menuitem"
				className="toolbar-button"
				title={intl.formatMessage({ id: 'noteEditor.insertMath' })}
				onClick={onInsertMath}
				onMouseDown={(event) => event.preventDefault()}
			><IconMath /></button>
		</Dropdown>
	);
}
