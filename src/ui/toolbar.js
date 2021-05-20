'use strict';

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

import { Button, StateButton } from './toolbar-elements/button';
import {
	IconChevronLeft,
	IconCitation,
	IconLink,
	IconMore,
	IconRemoveFormatting,
	IconSearch
} from './icons';
import AlignDropdown from './toolbar-elements/align-dropdown';
import Dropdown from './toolbar-elements/dropdown';
import TextDropdown from './toolbar-elements/text-dropdown';

function Toolbar({ viewMode, enableReturnButton, menuState, linkState, unsaved, searchState, onClickReturn, onShowNote, onOpenWindow }) {
	const intl = useIntl();

	function handleMouseDown(event) {
		event.preventDefault();
	}

	return (
		<div className="toolbar" onMouseDown={handleMouseDown}>
			<div className="start">
				{enableReturnButton &&
					<Button
						icon={<IconChevronLeft/>}
						title={intl.formatMessage({ id: 'noteEditor.returnToNotesList' })}
						onClick={onClickReturn}
					/>}
			</div>
			<div className="middle">
				<TextDropdown menuState={menuState}/>
				<Button
					icon={<IconLink/>}
					title={intl.formatMessage({ id: 'noteEditor.insertLink' })}
					onClick={() => linkState.toggle()}
				/>
				<StateButton
					state={menuState.clearFormatting}
					icon={<IconRemoveFormatting/>}
					title={intl.formatMessage({ id: 'noteEditor.clearFormatting' })}
				/>
				<AlignDropdown menuState={menuState}/>
				<Button
					icon={<IconCitation/>}
					title={intl.formatMessage({ id: 'noteEditor.insertCitation' })}
					onClick={() => menuState.citation.run()}
				/>
				<StateButton
					state={{ isActive: searchState.active, run: () => searchState.setActive(!searchState.active) }}
					icon={<IconSearch/>}
					title={intl.formatMessage({ id: 'noteEditor.findAndReplace' })}
				/>
			</div>
			<div className="end">
				<Dropdown
					className="more-dropdown"
					icon={<IconMore/>}
					title={intl.formatMessage({ id: 'noteEditor.more' })}
				>
					{!unsaved && viewMode !== 'library' && <div className="option" onClick={onShowNote}>
						<FormattedMessage id="noteEditor.showInLibrary"/>
					</div>}
					{viewMode !== 'window' && <div className="option" onClick={onOpenWindow}>
						<FormattedMessage id="noteEditor.editInWindow"/>
					</div>}
				</Dropdown>
			</div>
		</div>
	);
}

export default Toolbar;
