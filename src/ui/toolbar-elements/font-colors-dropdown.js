'use strict';

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import cx from 'classnames';

import { IconClose, IconColor, IconTextColor } from '../icons';
import Dropdown from './dropdown';

const COLORS = [
	'#FFFFFF','#FFCCCC','#FFCC99','#FFFF99','#FFFFCC','#99FF99','#99FFFF','#CCFFFF','#CCCCFF','#FFCCFF',
	'#CCCCCC','#FF6666','#FF9966','#FFFF66','#FFFF33','#66FF99','#33FFFF','#66FFFF','#9999FF','#FF99FF',
	'#C0C0C0','#FF0000','#FF9900','#FFCC66','#FFFF00','#33FF33','#66CCCC','#33CCFF','#6666CC','#CC66CC',
	'#999999','#CC0000','#FF6600','#FFCC33','#FFCC00','#33CC00','#00CCCC','#3366FF','#6633FF','#CC33CC',
	'#666666','#990000','#CC6600','#CC9933','#999900','#009900','#339999','#3333FF','#6600CC','#993399',
	'#333333','#660000','#993300','#996633','#666600','#006600','#336666','#000099','#333399','#663366',
	'#000000','#330000','#663300','#663333','#333300','#003300','#003333','#000066','#330099','#330033'
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
