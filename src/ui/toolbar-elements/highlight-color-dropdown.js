'use strict';

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import cx from 'classnames';

import Dropdown from './dropdown';

import { IconColor, IconHighlighter } from '../custom-icons';
import IconRemoveColor from '../../../res/icons/24/remove-color.svg';

export default function HighlightColorDropdown({ highlightColorState, underlineColorState }) {
	const intl = useIntl();

	function handleColorPick(color) {
		if (underlineColorState.state.isCursorInUnderline) {
			underlineColorState.state.setColor(color);
		}
		else {
			highlightColorState.state.setColor(color);
		}
	}

	function handleColorClear() {
		if (underlineColorState.state.isCursorInUnderline) {
			underlineColorState.state.removeColor();
		}
		else {
			highlightColorState.state.removeColor();
		}
	}

	let colorState = underlineColorState.state.isCursorInUnderline ? underlineColorState : highlightColorState;

	let activeColor = colorState.state.activeColors.length === 1
		? colorState.state.activeColors[0]
		: null;

	let clear = !!colorState.state.activeColors.length;

	return (
		<Dropdown
			className={cx('highlight-color-dropdown', {clear})}
			icon={<IconHighlighter color={activeColor && (activeColor[0] === '#' ? activeColor.slice(0, 7) : activeColor)}/>}
			title={intl.formatMessage({ id: 'noteEditor.highlightText' })}
		>
			<div className="grid">
				{clear && <button
					role="menuitem"
					className="color-button"
					title={intl.formatMessage({ id: 'noteEditor.removeColor' })}
					onClick={handleColorClear}
				>
					<IconRemoveColor/>
				</button>}
				{
					colorState.state.availableColors.slice(0, 8).map(([name, code], i) => {
						return (
							<button
								key={i}
								className="color-button"
								title={name ? intl.formatMessage({ id: 'general.' + name }) : code}
								onClick={() => handleColorPick(code)}
								onMouseDown={(event) => event.preventDefault()}
							>
								<IconColor color={code[0] === '#' ? code.slice(0, 7) : code} active={highlightColorState.state.activeColors.includes(code)}/>
							</button>
						)
					})
				}
			</div>
			<div className="grid">
				{
					colorState.state.availableColors.slice(8).map(([name, code], i) => {
						const isActive = colorState.state.activeColors.includes(code);
						return (
							<button
								role="menuitem"
								key={i}
								className="color-button"
								title={name ? intl.formatMessage({ id: 'general.' + name }) : code}
								onClick={() => handleColorPick(code)}
								onMouseDown={(event) => event.preventDefault()}
							>
								<IconColor color={code} active={isActive}/>
							</button>
						)
					})
				}
			</div>
		</Dropdown>
	);
}
