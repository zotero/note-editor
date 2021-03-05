'use strict';

import React from 'react';
import { Button, StateButton } from './toolbar-elements/button';
import cx from 'classnames';
import {
	IconChevronLeft,
	IconCitation,
	IconLink, IconMore,
	IconRemoveFormatting,
	IconSearch
} from './icons';
import AlignDropdown from './toolbar-elements/align-dropdown';
import Dropdown from './toolbar-elements/dropdown';
import TextDropdown from './toolbar-elements/text-dropdown';

function Toolbar({ viewMode, enableReturnButton, menuState, linkState, unsaved, searchState, onClickReturn, onShowNote, onOpenWindow }) {
	function handleMouseDown(event) {
		event.preventDefault();
	}

	return (
		<div className="toolbar" onMouseDown={handleMouseDown}>
			<div className="start">
				{enableReturnButton && <Button icon={<IconChevronLeft/>} title="Return to Notes List" onClick={onClickReturn}/>}
			</div>
			<div className="middle">
				<TextDropdown menuState={menuState}/>
				<Button icon={<IconLink/>} title="Link" onClick={() => linkState.popup.toggle()}/>
				<StateButton state={menuState.clearFormatting} icon={<IconRemoveFormatting/>} title="Clear Formatting"/>
				<AlignDropdown menuState={menuState} />
				<Button icon={<IconCitation/>} title="Insert Citation" onClick={() => menuState.citation.run()}/>
				<StateButton state={{ isActive: searchState.active, run: () => searchState.setActive(!searchState.active) }} icon={<IconSearch/>} title="Find and Replace"/>
			</div>
			<div className="end">
				<Dropdown className="more-dropdown" icon={<IconMore/>} title="More">
					{!unsaved && viewMode !== 'library' && <div className="option" onClick={onShowNote}>Show in Library</div>}
					{viewMode !== 'window' && <div className="option" onClick={onOpenWindow}>Edit in a Separate Window</div>}
				</Dropdown>
			</div>
		</div>
	);
}

export default Toolbar;
