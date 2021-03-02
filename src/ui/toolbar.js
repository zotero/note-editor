'use strict';

import React from 'react';
import Button from './toolbar-elements/button';
import ColorPicker from './toolbar-elements/color-picker';
import Dropdown from './toolbar-elements/dropdown';
import cx from 'classnames';
import {
	IconAlignLeft,
	IconBold,
	IconCitation,
	IconItalic,
	IconLink,
	IconRemoveFormatting,
	IconSearch,
	IconUnderline
} from './icons';

function Toolbar({ enableReturnButton, menuState, linkState, searchState, onClickReturn }) {
	function handleMouseDown(event) {
		event.preventDefault();
	}

	return (
		<div className="toolbar" onMouseDown={handleMouseDown}>
			{enableReturnButton ? <div className="toolbar-button return-button" onClick={onClickReturn}></div> : <div/>}
			<div className="middle">
				<Dropdown blocks={menuState.blocks}/>
				<Button state={menuState.strong} icon={<IconBold/>} title="Bold"/>
				<Button state={menuState.em} icon={<IconItalic/>} title="Italic"/>
				<Button state={menuState.underline} icon={<IconUnderline/>} title="Underline"/>
				<Button state={{ isActive: linkState.isActive, run: () => linkState.popup.toggle() }} icon={<IconLink/>} title="Link"/>
				<Button state={menuState.clearFormatting} icon={<IconRemoveFormatting/>} title="Clear formatting"/>
				<div
					className={cx('toolbar-button', { active: false })}
					title="Insert citation"
					onMouseDown={(e) => {
						e.preventDefault();
						menuState.citation.run();
					}}
				>
					<span className="icon">{<IconCitation/>}</span>
				</div>
				<Button state={menuState.alignLeft} icon={<IconAlignLeft/>} title="Align left"/>
				<Button state={{ isActive: searchState.active, run: () => searchState.setActive(!searchState.active) }} icon={<IconSearch/>} title="Find and replace"/>
			</div>
			<div></div>
		</div>
	);
}

export default Toolbar;
