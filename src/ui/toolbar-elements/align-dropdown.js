'use strict';

import React from 'react';
import { useIntl } from 'react-intl';

import { IconAlignCenter, IconAlignLeft, IconAlignRight } from '../icons';
import Dropdown from './dropdown';
import { StateButton } from './button';

export default function AlignDropdown({ menuState }) {
	const intl = useIntl();

	let icon = menuState.alignCenter.isActive && <IconAlignCenter/>
		|| menuState.alignRight.isActive && <IconAlignRight/>
		|| <IconAlignLeft/>

	return (
		<Dropdown
			className="align-dropdown"
			icon={icon}
			title={intl.formatMessage({id: 'noteEditor.align'})}
		>
			<StateButton
				state={menuState.alignLeft}
				icon={<IconAlignLeft/>}
				title={intl.formatMessage({id: 'noteEditor.alignLeft'})}
			/>
			<StateButton
				state={menuState.alignCenter}
				icon={<IconAlignCenter/>}
				title={intl.formatMessage({id: 'noteEditor.alignCenter'})}
			/>
			<StateButton
				state={menuState.alignRight}
				icon={<IconAlignRight/>}
				title={intl.formatMessage({id: 'noteEditor.alignRight'})}
			/>
		</Dropdown>
	);
}
