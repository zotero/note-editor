'use strict';

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import cx from 'classnames';

import { IconClose, IconColor, IconHighlighter, IconTextColor } from '../icons';
import Dropdown from './dropdown';

export default function TextColorDropdown({ textColorState }) {
	const intl = useIntl();

	function handleColorPick(color) {
		textColorState.state.setColor(color)
	}

	function handleColorClear() {
		textColorState.state.removeColor();
	}

	let activeColor = textColorState.state.activeColors.length === 1
		? textColorState.state.activeColors[0]
		: null;

	let clear = !!textColorState.state.activeColors.length;

	return (
		<Dropdown
			className={cx('text-color-dropdown', {clear})}
			icon={<IconTextColor color={activeColor || '#000000'}/>}
			title={intl.formatMessage({ id: 'noteEditor.textColor' })}
		>
			<div className="grid">
				{clear && <button
					className="color-button"
					title={intl.formatMessage({ id: 'noteEditor.removeColor' })}
					onClick={handleColorClear}
				>
					<IconClose/>
				</button>}
				{
					textColorState.state.availableColors.slice(0, 8).map(([name, code], i) => {
						return (
							<button
								key={i}
								className="color-button"
								title={name ? intl.formatMessage({ id: 'general.' + name }) : code}
								onClick={() => handleColorPick(code)}
								onMouseDown={(event) => event.preventDefault()}
							>
								<IconColor color={code[0] === '#' ? code.slice(0, 7) : code} active={textColorState.state.activeColors.includes(code)}/>
							</button>
						)
					})
				}
			</div>
			<div className="grid">
				{
					textColorState.state.availableColors.slice(10).map(([name, code], i) => {
						return (
							<button
								key={i}
								className="color-button"
								title={name ? intl.formatMessage({ id: 'general.' + name }) : code}
								onClick={() => handleColorPick(code)}
								onMouseDown={(event) => event.preventDefault()}
							>
								<IconColor color={code} active={textColorState.state.activeColors.includes(code)}/>
							</button>
						)
					})
				}
			</div>
		</Dropdown>
	);
}
