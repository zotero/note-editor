'use strict';

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import cx from 'classnames';

import { IconClose, IconColor, IconTextColor } from '../icons';
import Dropdown from './dropdown';

const COLORS = [
	'#000000','#660000','#993300','#666600','#006600','#336666','#333399','#663366',
	'#999999','#CC0000','#FF6600','#FFCC00','#33CC00','#33CCFF','#6633FF','#CC33CC',
	'#CCCCCC','#FF0000','#FF9900','#FFFF00','#33FF33','#66CCCC','#6666CC','#CC66CC',
	'#FFFFFF','#FFCCCC','#FFCC99','#FFFFCC','#99FF99','#99FFFF','#CCCCFF','#FFCCFF',
];

export default function FontColorsDropdown({ menuState }) {
	const intl = useIntl();

	function handleColorPick(color) {
		console.log('cooo', color)
		menuState.textColor.run(color);

	}

	function handleColorClear() {
		menuState.run(color);
	}

	return (
		<Dropdown
			className={cx('font-colors-dropdown')}
			icon={<IconTextColor color={menuState.textColor.color || '#000000'}/>}
			// title={intl.formatMessage({ id: 'noteEditor.textColor' })}
		>
			<div className="grid">
				{
					COLORS.map((code, i) => {
						return (
							<button
								key={i}
								className="color-button"
								title={code}
								onClick={() => handleColorPick(code)}
								onMouseDown={(event) => event.preventDefault()}
							>
								<IconColor color={code[0] === '#' ? code.slice(0, 7) : code}/>
							</button>
						)
					})
				}
			</div>
		</Dropdown>
	);
}
