'use strict';

import React from 'react';
import { useLocalization } from '@fluent/react';
import cx from 'classnames';

import Dropdown from './dropdown';

import { IconColor, IconHighlighter } from '../custom-icons';
import IconRemoveColor from '../../../res/icons/16/remove-color.svg';

export default function HighlightColorDropdown({ highlightColorState, underlineColorState }) {
	const { l10n } = useLocalization();

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
			className="color-dropdown"
			icon={<IconHighlighter color={activeColor && (activeColor[0] === '#' ? activeColor.slice(0, 7) : activeColor)} />}
			title={l10n.getString('note-editor-highlight-text')}
		>
			{clear &&
				<button role="menuitem" className="option" onClick={handleColorClear}>
					<div className="icon"><IconRemoveColor/></div>
					<div className="name">{l10n.getString('note-editor-remove-color')}</div>
				</button>
			}
			{clear && <div className="separator"/>}
			{
				colorState.state.availableColors.slice(0, 8).map(([name, code], i) => {
					let active = colorState.state.activeColors.includes(code);
				return (
					<button
						key={i}
						role="menuitem"
						className={cx('option', { active })}
						onClick={() => handleColorPick(code)}
						onMouseDown={(event) => event.preventDefault()}
					>
						<div className="icon">
							<IconColor color={code[0] === '#' ? code.slice(0, 7) : code}/>
						</div>
						<div className="name">{name ? l10n.getString('general-' + name) : code}</div>
					</button>
					)
				})
			}
			{colorState.state.availableColors.length >= 8 && <div className="separator"/>}
			{
				colorState.state.availableColors.slice(8).map(([name, code], i) => {
					let active = colorState.state.activeColors.includes(code);
				return (
					<button
						role="menuitem"
						key={i}
						className={cx('option', { active })}
						onClick={() => handleColorPick(code)}
						onMouseDown={(event) => event.preventDefault()}
					>
						<div className="icon"><IconColor color={code}/></div>
						<div className="name">{code}</div>
					</button>
					)
				})
			}
		</Dropdown>
	);
}
