'use strict';

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import cx from 'classnames';

import Dropdown from './dropdown';

import { IconColor, IconTextColor } from '../custom-icons';
import IconRemoveColor from '../../../res/icons/16/remove-color.svg';

export default function TextColorDropdown({ textColorState }) {
	const intl = useIntl();

	let colorState = textColorState;

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
			className="color-dropdown"
			icon={<IconTextColor color={activeColor && (activeColor[0] === '#' ? activeColor.slice(0, 7) : activeColor)}/>}
			title={intl.formatMessage({ id: 'noteEditor.highlightText' })}
		>
			{clear &&
				<button role="menuitem" className="option" onClick={handleColorClear}>
					<div className="icon"><IconRemoveColor/></div>
					<div className="name"><FormattedMessage id="noteEditor.removeColor"/></div>
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
							<div className="name">{name ? <FormattedMessage id={'general.' + name}/> : code}</div>
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
