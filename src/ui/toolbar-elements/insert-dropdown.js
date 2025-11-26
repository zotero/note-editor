'use strict';

import React from 'react';
import { useLocalization } from '@fluent/react';

import Dropdown from './dropdown';

import IconInsert from '../../../res/icons/20/plus.svg';
import IconImage from '../../../res/icons/20/image.svg';
import IconMath from '../../../res/icons/20/math.svg';
import IconTable from '../../../res/icons/20/table.svg';

export default function InsertDropdown({ isAttachmentNote, onInsertTable, onInsertMath, onInsertImage }) {
	const { l10n } = useLocalization();

	return (
		<Dropdown
			className="insert-dropdown"
			icon={<IconInsert />}
			title={l10n.getString('general-insert')}
		>
			{ !isAttachmentNote && <button
				role="menuitem"
				className="toolbar-button"
				title={l10n.getString('note-editor-image')}
				onClick={onInsertImage}
				onMouseDown={(event) => event.preventDefault()}
			><IconImage /></button> }
			<button
				role="menuitem"
				className="toolbar-button"
				title={l10n.getString('note-editor-table')}
				onClick={onInsertTable}
				onMouseDown={(event) => event.preventDefault()}
			><IconTable /></button>
			<button
				role="menuitem"
				className="toolbar-button"
				title={l10n.getString('note-editor-math')}
				onClick={onInsertMath}
				onMouseDown={(event) => event.preventDefault()}
			><IconMath /></button>
		</Dropdown>
	);
}
