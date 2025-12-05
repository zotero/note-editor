'use strict';

import React, { useCallback, useRef } from 'react';
import { useLocalization } from '@fluent/react';

import { Button, StateButton } from './toolbar-elements/button';
import AlignDropdown from './toolbar-elements/align-dropdown';
import Dropdown from './toolbar-elements/dropdown';
import TextDropdown from './toolbar-elements/text-dropdown';
import HighlightColorDropdown from './toolbar-elements/highlight-color-dropdown';
import TextColorDropdown from './toolbar-elements/text-color-dropdown';
import InsertDropdown from './toolbar-elements/insert-dropdown';
import { mod } from '../core/utils';

import IconChevronLeft from '../../res/icons/20/chevron-left.svg';
import IconToggleContext from "../../res/icons/20/sidebar.svg";
import IconToggleContextBottom from "../../res/icons/20/sidebar-bottom.svg";
import IconCitation from '../../res/icons/20/cite.svg';
import IconLink from '../../res/icons/20/link.svg';
import IconMore from '../../res/icons/20/options.svg';
import IconRemoveFormatting from '../../res/icons/20/clear-format.svg';
import IconSearch from '../../res/icons/20/magnifier.svg';

function Toolbar({
	viewMode,
	enableReturnButton,
	contextPaneButtonMode,
	textColorState,
	highlightColorState,
	underlineColorState,
	menuState,
	isAttachmentNote,
	linkState,
	citationState,
	unsaved,
	searchState,
	onClickReturn,
	onToggleContextPane,
	onFocusBack,
	onFocusForward,
	onShowNote,
	onOpenWindow,
	onInsertTable,
	onInsertMath,
	onInsertImage,
}) {
	const { l10n } = useLocalization();
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
		// Shift+Tab: focus back to the element outside the editor
		if (ev.key === 'Tab' && ev.shiftKey) {
			ev.preventDefault();
			if (onFocusBack) {
				onFocusBack();
			}
			return;
		}
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
						title={l10n.getString('note-editor-return-to-notes-list')}
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
					title={l10n.getString('note-editor-clear-formatting')}
				/>
				<Button
					icon={<IconLink/>}
					title={l10n.getString('note-editor-insert-link')}
					onClick={() => linkState.toggle()}
				/>
				{['ios', 'web'].includes(viewMode) && <AlignDropdown menuState={menuState}/>}
				{!['ios', 'web'].includes(viewMode) && <Button
					icon={<IconCitation/>}
					title={l10n.getString('note-editor-insert-citation')}
					onClick={() => citationState.insertCitation()}
				/>}
				{['ios', 'web'].includes(viewMode) && <InsertDropdown
					isAttachmentNote={isAttachmentNote}
					onInsertTable={onInsertTable}
					onInsertMath={onInsertMath}
					onInsertImage={onInsertImage}
				/>}
				<StateButton
					state={{ isActive: searchState.active, run: () => searchState.setActive(!searchState.active) }}
					icon={<IconSearch/>}
					title={l10n.getString('note-editor-find-and-replace')}
					enableFocus={true}
				/>
			</div>
			<div className="end">
				{!['ios', 'web'].includes(viewMode) && (
					<Dropdown
						className="more-dropdown"
						icon={<IconMore />}
						title={l10n.getString('note-editor-more')}
					>
						{!unsaved && viewMode !== 'library' && (
							<button className="option" onClick={onShowNote}>
								{l10n.getString('general-show-in-library')}
							</button>
						)}
						{viewMode !== 'window' && viewMode !== 'ios' && (
							<button className="option" onClick={onOpenWindow}>
								{l10n.getString('note-editor-edit-in-window')}
							</button>
						)}
						{(!unsaved && viewMode !== 'library') ||
						(viewMode !== 'window' && viewMode !== 'ios') && (
							<div className="separator" />
						)}
						{(highlightColorState.state.canApplyAnnotationColors ||
							underlineColorState.state.canApplyAnnotationColors) && (
							<button
								className="option"
								onClick={() => {
									highlightColorState.state.applyAnnotationColors();
									underlineColorState.state.applyAnnotationColors();
								}}
							>
								{l10n.getString('note-editor-apply-annotation-colors')}
							</button>
						)}
						{(highlightColorState.state.canRemoveAnnotationColors ||
							underlineColorState.state.canRemoveAnnotationColors) && (
							<button
								className="option"
								onClick={() => {
									highlightColorState.state.removeAnnotationColors();
									underlineColorState.state.removeAnnotationColors();
								}}
							>
								{l10n.getString('note-editor-remove-annotation-colors')}
							</button>
						)}
						{citationState.state.canAddCitations && (
							<button
								className="option"
								onClick={() => citationState.state.addCitations()}
							>
								{l10n.getString('note-editor-add-citations')}
							</button>
						)}
						{citationState.state.canRemoveCitations && (
							<button
								className="option"
								onClick={() => citationState.state.removeCitations()}
							>
								{l10n.getString('note-editor-remove-citations')}
							</button>
						)}
					</Dropdown>
				)}
				{contextPaneButtonMode && (
					<Button
						className={`toolbar-button-toggleContextPane ${contextPaneButtonMode}`}
						icon={contextPaneButtonMode === 'stacked' ? <IconToggleContextBottom /> : <IconToggleContext />}
						title={l10n.getString('note-editor-toggle-context-pane')}
						onClick={onToggleContextPane}
					/>
				)}
			</div>
		</div>
	);
}

export default Toolbar;
