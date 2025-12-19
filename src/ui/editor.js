'use strict';

import React, { useCallback, useRef, useState, useLayoutEffect, useEffect, Fragment } from 'react';
import { LocalizationProvider, ReactLocalization, useLocalization } from '@fluent/react';

import Toolbar from './toolbar';
import Findbar from './findbar';
import LinkPopup from './popups/link-popup';
import HighlightPopup from './popups/highlight-popup';
import CitationPopup from './popups/citation-popup';
import ImagePopup from './popups/image-popup';
import TablePopup from './popups/table-popup';
import Noticebar from './noticebar';
import { bundle } from '../fluent';

function Editor(props) {
	const { l10n } = useLocalization();

	const editorRef = useRef(null);
	const [editorState, setEditorState] = useState(props.editorCore.pluginState);
	const [contextPaneButtonMode, setContextPaneButtonMode] = useState(props.contextPaneButtonMode);

	const [refReady, setRefReady] = useState(false);
	useEffect(() => {
		setRefReady(true);
	}, []);

	useLayoutEffect(() => {
		props.editorCore.onUpdateState = (state) => {
			setEditorState(props.editorCore.pluginState);
		};
		props.editorCore.setContextPaneButtonMode = setContextPaneButtonMode;
		editorRef.current.appendChild(props.editorCore.view.dom);
	}, []);

	const handleInsertTable = useCallback(() => {
		props.editorCore.view.dom.focus();
		props.editorCore.pluginState.table.insertTable(2, 2);
	}, [props.editorCore]);

	const handleInsertMath = useCallback(() => {
		props.editorCore.view.dom.focus();
		props.editorCore.insertMath()
	}, [props.editorCore]);

	const handleInsertImage = useCallback(() => {
		props.editorCore.view.dom.focus();
		props.editorCore.pluginState.image.openFilePicker();
	}, [props.editorCore]);

	return (
		<div className="editor">
			{!props.disableUI && <Toolbar
				viewMode={props.viewMode}
				enableReturnButton={props.enableReturnButton}
				contextPaneButtonMode={contextPaneButtonMode}
				textColorState={editorState.textColor}
				highlightColorState={editorState.highlightColor}
				underlineColorState={editorState.underlineColor}
				menuState={editorState.menu}
				isAttachmentNote={props.editorCore.isAttachmentNote}
				linkState={editorState.link}
				citationState={editorState.citation}
				unsaved={editorState.core.unsaved}
				searchState={editorState.search}
				onClickReturn={props.onClickReturn}
				onToggleContextPane={props.onToggleContextPane}
				onFocusBack={props.onFocusBack}
				onFocusForward={props.onFocusForward}
				onShowNote={props.onShowNote}
				onOpenWindow={props.onOpenWindow}
				onInsertTable={handleInsertTable}
				onInsertMath={handleInsertMath}
				onInsertImage={handleInsertImage}
			/>}
			<Findbar searchState={editorState.search} active={editorState.search.active}/>
			{props.showUpdateNotice && <Noticebar>
				{l10n.getString('note-editor-update-notice')
				// Transform \n to <br>
				.split(/\n/)
				.reduce((result, word) => result.length ? [...result, <br/>, word] : [word], [])}
			</Noticebar>}
			<div className="editor-core" ref={editorRef}>
				<div className="relative-container">
					{refReady && !props.disableUI && <Fragment>
						{['ios', 'web'].includes(props.viewMode) && !editorState.link?.popup.active && editorState.table.isTableSelected() && <TablePopup parentRef={editorRef} tableState={editorState.table} /> }
						{editorState.link && <LinkPopup parentRef={editorRef} pluginState={editorState.link.popup}/>}
						{editorState.highlight && <HighlightPopup parentRef={editorRef} highlightState={editorState.highlight} citationState={editorState.citation} viewMode={props.viewMode} />}
						{!['web'].includes(props.viewMode) && editorState.image && <ImagePopup parentRef={editorRef} imageState={editorState.image} citationState={editorState.citation}/>}
						{editorState.citation && <CitationPopup
							parentRef={editorRef}
							citationState={editorState.citation}
							viewMode={props.viewMode}
						/>}
					</Fragment>}
				</div>
			</div>
		</div>
	);
}

function EditorWrapper(props) {
	return (
		<LocalizationProvider l10n={new ReactLocalization([bundle])}>
			<Editor {...props} />
		</LocalizationProvider>
	)
}

export default EditorWrapper;
