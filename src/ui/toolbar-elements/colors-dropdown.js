'use strict';

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import cx from 'classnames';

import { IconClose, IconColor, IconHighlighter } from '../icons';
import Dropdown from './dropdown';

export default function ColorsDropdown({ colorState }) {
	const intl = useIntl();

	function handleColorPick(color) {
		colorState.state.setColor(color)
	}

	function handleColorClear() {
		colorState.state.removeColor();
	}

	let activeColor = colorState.state.activeColors.length === 1
		? colorState.state.activeColors[0]
		: null;

	let clear = !!colorState.state.activeColors.length;

	return (
		<Dropdown
			className={cx('colors-dropdown', {clear})}
			icon={<IconHighlighter color={activeColor}/>}
			title={intl.formatMessage({ id: 'noteEditor.highlightText' })}
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
					colorState.state.availableColors.map(([name, code], i) => {
						return (
							<button
								key={i}
								className="color-button"
								title={name ? intl.formatMessage({ id: 'general.' + name }) : code}
								onClick={() => handleColorPick(code)}
								onMouseDown={(event) => event.preventDefault()}
							>
								<IconColor color={code} active={colorState.state.activeColors.includes(code)}/>
							</button>
						)
					})
				}
			</div>
		</Dropdown>
	);
}
