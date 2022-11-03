'use strict';

import React, { useCallback } from 'react';
import { useIntl } from 'react-intl';

import { IconInsert, IconImage, IconMath, IconTable } from '../icons';
import Dropdown from './dropdown';

export default function InsertDropdown() {
	const intl = useIntl();

	const handleInsert = useCallback((insertType) => {

	}, []);

	return (
		<Dropdown
			className="insert-dropdown"
			icon={<IconInsert />}
			title={intl.formatMessage({id: 'general.insert'})}
		>
			<button
				className="toolbar-button"
				title={intl.formatMessage({ id: 'noteEditor.insertImage' })}
				onClick={() => handleInsert('image')}
				onMouseDown={(event) => event.preventDefault()}
			><IconImage /></button>
			<button
				className="toolbar-button"
				title={intl.formatMessage({ id: 'noteEditor.insertTable' })}
				onClick={() => handleInsert('table')}
				onMouseDown={(event) => event.preventDefault()}
			><IconTable /></button>
			<button
				className="toolbar-button"
				title={intl.formatMessage({ id: 'noteEditor.insertMath' })}
				onClick={() => handleInsert('math')}
				onMouseDown={(event) => event.preventDefault()}
			><IconMath /></button>
		</Dropdown>
	);
}
