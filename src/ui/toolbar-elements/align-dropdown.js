'use strict';

import React from 'react';
import { useLocalization } from '@fluent/react';

import Dropdown from './dropdown';
import { StateButton } from './button';

import IconAlignLeft from '../../../res/icons/20/align-left.svg';
import IconAlignCenter from '../../../res/icons/20/align-center.svg';
import IconAlignRight from '../../../res/icons/20/align-right.svg';

export default function AlignDropdown({ menuState }) {
	const { l10n } = useLocalization();

	let icon = menuState.alignCenter.isActive && <IconAlignCenter/>
		|| menuState.alignRight.isActive && <IconAlignRight/>
		|| <IconAlignLeft/>

	return (
		<Dropdown
			className="align-dropdown"
			icon={icon}
			title={l10n.getString('note-editor-align')}
		>
			<StateButton
				state={menuState.alignLeft}
				icon={<IconAlignLeft/>}
				title={l10n.getString('note-editor-align-left')}
			/>
			<StateButton
				state={menuState.alignCenter}
				icon={<IconAlignCenter/>}
				title={l10n.getString('note-editor-align-center')}
			/>
			<StateButton
				state={menuState.alignRight}
				icon={<IconAlignRight/>}
				title={l10n.getString('note-editor-align-right')}
			/>
		</Dropdown>
	);
}
