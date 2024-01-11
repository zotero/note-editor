'use strict';

import React, { useCallback, useRef} from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

import { Button, StateButton } from './toolbar-elements/button';

import IconChevronLeft from '../../res/icons/20/chevron-left.svg';
import IconCitation from '../../res/icons/20/cite.svg';
import IconLink from '../../res/icons/20/link.svg';
import IconMore from '../../res/icons/20/options.svg';
import IconRemoveFormatting from '../../res/icons/20/clear-format.svg';
import IconSearch from '../../res/icons/20/magnifier.svg';

import AlignDropdown from './toolbar-elements/align-dropdown';
import Dropdown from './toolbar-elements/dropdown';
import TextDropdown from './toolbar-elements/text-dropdown';
import HighlightColorDropdown from './toolbar-elements/highlight-color-dropdown';
import TextColorDropdown from './toolbar-elements/text-color-dropdown';
import InsertDropdown from './toolbar-elements/insert-dropdown';
import { mod } from '../core/utils';

function Toolbar({ viewMode, enableReturnButton, textColorState, highlightColorState, underlineColorState, menuState, isAttachmentNote, linkState, citationState, unsaved, searchState, onClickReturn, onShowNote, onOpenWindow, onInsertTable, onInsertMath, onInsertImage }) {
	const intl = useIntl();
	const toolbarRef = useRef(null);
	const lastFocusedIndex = useRef(0);

	const getCandidateNodes = useCallback(() =>
		Array.from(toolbarRef.current.querySelectorAll('button:not([disabled])')).filter(n => !n.closest('.popup')), []
	);

	const handleFocus = useCallback((ev) => {
		const candidateNodes = getCandidateNodes();
		if(!candidateNodes.includes(ev.target)) {
			return;
		}
		candidateNodes.forEach(node => node.tabIndex = "-1");
		candidateNodes?.[lastFocusedIndex.current].focus();
	}, [viewMode, getCandidateNodes]);

	const handleBlur = useCallback((ev) => {
		const candidateNodes = getCandidateNodes();
		if (ev.relatedTarget?.closest('.toolbar') === toolbarRef.current) {
			return;
		}
		toolbarRef.current.querySelectorAll('button').forEach(node => node.removeAttribute('tabindex'));
	}, [viewMode]);

	const handleKeyDown = useCallback((ev) => {
		const candidateNodes = getCandidateNodes();
		if (ev.key === 'ArrowLeft') {
			lastFocusedIndex.current = mod((lastFocusedIndex.current - 1), candidateNodes.length);
		}
		else if (ev.key === 'ArrowRight') {
			lastFocusedIndex.current = mod((lastFocusedIndex.current + 1), candidateNodes.length);
		}
		if (['ArrowLeft', 'ArrowRight'].includes(ev.key)) {
			candidateNodes?.[lastFocusedIndex.current].focus();
		}
	}, [viewMode, getCandidateNodes]);

	return (
		<div
			className="toolbar"
			onFocus={handleFocus}
			onBlur={handleBlur}
			onKeyDown={handleKeyDown}
			ref={toolbarRef}
			role="toolbar"
			aria-orientation="horizontal"
		>
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
				<TextColorDropdown textColorState={textColorState}/>
				<HighlightColorDropdown highlightColorState={highlightColorState} underlineColorState={underlineColorState}/>
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
				{['ios', 'web'].includes(viewMode) && <AlignDropdown menuState={menuState}/>}
				{!['ios', 'web'].includes(viewMode) && <Button
					icon={<IconCitation/>}
					title={intl.formatMessage({ id: 'noteEditor.insertCitation' })}
					onClick={() => citationState.insertCitation()}
				/>}
				<StateButton
					state={{ isActive: searchState.active, run: () => searchState.setActive(!searchState.active) }}
					icon={<IconSearch/>}
					title={intl.formatMessage({ id: 'noteEditor.findAndReplace' })}
				/>
				{viewMode === 'web' && <InsertDropdown
					isAttachmentNote={isAttachmentNote}
					onInsertTable={ onInsertTable }
					onInsertMath={ onInsertMath }
					onInsertImage={ onInsertImage }
				/>}
			</div>
			<div className="end">
				{!['web'].includes(viewMode) && <Dropdown
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
					{(!unsaved && viewMode !== 'library' || viewMode !== 'window' && viewMode !== 'ios') && <div className="separator"/>}
					{(highlightColorState.state.canApplyAnnotationColors || underlineColorState.state.canApplyAnnotationColors) && <button className="option" onClick={() => {
						highlightColorState.state.applyAnnotationColors();
						underlineColorState.state.applyAnnotationColors()
					}}>
						<FormattedMessage id="noteEditor.applyAnnotationColors"/>
					</button>}
					{(highlightColorState.state.canRemoveAnnotationColors || underlineColorState.state.canRemoveAnnotationColors ) && <button className="option" onClick={() => {
						highlightColorState.state.removeAnnotationColors();
						underlineColorState.state.removeAnnotationColors();
					}}>
						<FormattedMessage id="noteEditor.removeAnnotationColors"/>
					</button>}
					{citationState.state.canAddCitations && <button className="option" onClick={() => citationState.state.addCitations()}>
						<FormattedMessage id="noteEditor.addCitations"/>
					</button>}
					{citationState.state.canRemoveCitations && <button className="option" onClick={() => citationState.state.removeCitations()}>
						<FormattedMessage id="noteEditor.removeCitations"/>
					</button>}
				</Dropdown>}
			</div>
		</div>
	);
}

export default Toolbar;
