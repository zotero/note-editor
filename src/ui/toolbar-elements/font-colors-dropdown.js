'use strict';

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import cx from 'classnames';

import { IconClose, IconColor, IconTextColor } from '../icons';
import Dropdown from './dropdown';

const COLORS = [
	'#000000',  '#666666', '#999999',  '#CCCCCC', '#FFFFFF',
	'#330000',  '#990000', '#CC0000',  '#FF6666', '#FFCCCC',
	'#663300',  '#CC6600', '#FF6600',  '#FF9966', '#FFCC99',
	'#663333',  '#CC9933', '#FFCC33',  '#FFFF66', '#FFFF99',
	'#003300',  '#009900', '#33CC00',  '#66FF99', '#99FF99',
	'#003333',  '#339999', '#00CCCC',  '#33FFFF', '#99FFFF',
	'#330099',  '#6600CC', '#6633FF',  '#9999FF', '#CCCCFF',
	'#330033',  '#993399', '#CC33CC',  '#FF99FF', '#FFCCFF',
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
