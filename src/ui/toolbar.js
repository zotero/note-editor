'use strict';

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

import { Button, StateButton } from './toolbar-elements/button';
import {
	IconChevronLeft,
	IconCitation, IconColors,
	IconLink,
	IconMore,
	IconRemoveFormatting,
	IconSearch
} from './icons';
import AlignDropdown from './toolbar-elements/align-dropdown';
import Dropdown from './toolbar-elements/dropdown';
import TextDropdown from './toolbar-elements/text-dropdown';
import ColorsDropdown from './toolbar-elements/colors-dropdown';

function Toolbar({ viewMode, enableReturnButton, colorState, menuState, linkState, citationState, unsaved, searchState, onClickReturn, onShowNote, onOpenWindow }) {
	const intl = useIntl();

	return (
		<div className="toolbar">
			<div className="start">
				{enableReturnButton &&
					<Button
						className="toolbar-button-return"
						icon={<IconChevronLeft/>}
						title={intl.formatMessage({ id: 'noteEditor.returnToNotesList' })}
						onClick={onClickReturn}
					/>}
			</div>
			<div className="middle">
				<TextDropdown menuState={menuState}/>
				<ColorsDropdown colorState={colorState}/>
				<StateButton
					state={menuState.clearFormatting}
					icon={<IconRemoveFormatting/>}
					title={intl.formatMessage({ id: 'noteEditor.clearFormatting' })}
				/>
				<Button
					icon={<IconLink/>}
					title={intl.formatMessage({ id: 'noteEditor.insertLink' })}
					onClick={() => linkState.toggle()}
				/>
				{viewMode === 'ios' && <AlignDropdown menuState={menuState}/>}
				{viewMode !== 'ios' && <Button
					icon={<IconCitation/>}
					title={intl.formatMessage({ id: 'noteEditor.insertCitation' })}
					onClick={() => citationState.insertCitation()}
				/>}
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
					{!unsaved && viewMode !== 'library' && <button className="option" onClick={onShowNote}>
						<FormattedMessage id="general.showInLibrary"/>
					</button>}
					{viewMode !== 'window' && viewMode !== 'ios' && <button className="option" onClick={onOpenWindow}>
						<FormattedMessage id="noteEditor.editInWindow"/>
					</button>}
					{colorState.state.canApplyAnnotationColors && <button className="option" onClick={() => colorState.state.applyAnnotationColors()}>
						<FormattedMessage id="noteEditor.applyAnnotationColors"/>
					</button>}
					{colorState.state.canRemoveAnnotationColors && <button className="option" onClick={() => colorState.state.removeAnnotationColors()}>
						<FormattedMessage id="noteEditor.removeAnnotationColors"/>
					</button>}
					{citationState.state.canAddCitations && <button className="option" onClick={() => citationState.state.addCitations()}>
						<FormattedMessage id="noteEditor.addCitations"/>
					</button>}
					{citationState.state.canRemoveCitations && <button className="option" onClick={() => citationState.state.removeCitations()}>
						<FormattedMessage id="noteEditor.removeCitations"/>
					</button>}
				</Dropdown>
			</div>
		</div>
	);
}

export default Toolbar;
