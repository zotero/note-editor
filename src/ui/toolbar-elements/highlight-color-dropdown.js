'use strict';

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import cx from 'classnames';

import { IconClose, IconColor, IconHighlighter } from '../icons';
import Dropdown from './dropdown';

export default function HighlightColorDropdown({ highlightColorState }) {
	const intl = useIntl();

	function handleColorPick(color) {
		highlightColorState.state.setColor(color)
	}

	function handleColorClear() {
		highlightColorState.state.removeColor();
	}

	let activeColor = highlightColorState.state.activeColors.length === 1
		? highlightColorState.state.activeColors[0]
		: null;

	let clear = !!highlightColorState.state.activeColors.length;

	return (
		<Dropdown
			className={cx('highlight-color-dropdown', {clear})}
			icon={<IconHighlighter color={activeColor && (activeColor[0] === '#' ? activeColor.slice(0, 7) : activeColor) || '#000000'}/>}
			title={intl.formatMessage({ id: 'noteEditor.highlightText' })}
		>
			<div className="grid">
				{clear && <button
					role="menuitem"
					className="color-button"
					title={intl.formatMessage({ id: 'noteEditor.removeColor' })}
					onClick={handleColorClear}
				>
					<IconClose/>
				</button>}
				{
					highlightColorState.state.availableColors.slice(0, 8).map(([name, code], i) => {
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
					highlightColorState.state.availableColors.slice(8).map(([name, code], i) => {
						const isActive = highlightColorState.state.activeColors.includes(code);
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
