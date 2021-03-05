'use strict';

import React from 'react';
import { IconAlignCenter, IconAlignLeft, IconAlignRight } from '../icons';
import Dropdown from './dropdown';
import { StateButton } from './button';

export default function AlignDropdown({ menuState }) {
	let icon = menuState.alignCenter.isActive && <IconAlignCenter/>
		|| menuState.alignRight.isActive && <IconAlignRight/>
		|| <IconAlignLeft/>

	return (
		<Dropdown className="align-dropdown" icon={icon} title="Alignment">
			<StateButton state={menuState.alignLeft} icon={<IconAlignLeft/>} title="Align Left"/>
			<StateButton state={menuState.alignCenter} icon={<IconAlignCenter/>} title="Align Center"/>
			<StateButton state={menuState.alignRight} icon={<IconAlignRight/>} title="Align Right"/>
		</Dropdown>
	);
}
