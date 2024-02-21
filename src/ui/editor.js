'use strict';

import React, { useCallback, useRef, useState, useLayoutEffect, useEffect, Fragment } from 'react';
import { useIntl } from 'react-intl';

import Toolbar from './toolbar';
import Findbar from './findbar';
import LinkPopup from './popups/link-popup';
import HighlightPopup from './popups/highlight-popup';
import CitationPopup from './popups/citation-popup';
import ImagePopup from './popups/image-popup';
import TablePopup from './popups/table-popup';
import Noticebar from './noticebar';

function Editor(props) {
	const intl = useIntl();
	const editorRef = useRef(null);
	const [editorState, setEditorState] = useState(props.editorCore.pluginState);

	const [refReady, setRefReady] = useState(false);
	useEffect(() => {
		setRefReady(true);
	}, []);

	useLayoutEffect(() => {
		props.editorCore.onUpdateState = (state) => {
			setEditorState(props.editorCore.pluginState);
		};
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
				onShowNote={props.onShowNote}
				onOpenWindow={props.onOpenWindow}
				onInsertTable={handleInsertTable}
				onInsertMath={handleInsertMath}
				onInsertImage={handleInsertImage}
			/>}
			<Findbar searchState={editorState.search} active={editorState.search.active}/>
			{props.showUpdateNotice && <Noticebar>
				{intl.formatMessage({ id: 'noteEditor.updateNotice' })
				.replace(/%1\$S/g, intl.formatMessage({ id: 'zotero.appName' }))
				// Transform \n to <br>
				.split(/\n/)
				.reduce((result, word) => result.length ? [...result, <br/>, word] : [word], [])}
			</Noticebar>}
			<div className="editor-core" ref={editorRef}>
				<div className="relative-container">
					{refReady && !props.disableUI && <Fragment>
						{['web'].includes(props.viewMode) && !editorState.link?.popup.active && editorState.table.isTableSelected() && <TablePopup parentRef={editorRef} tableState={editorState.table} /> }
						{editorState.link && <LinkPopup parentRef={editorRef} pluginState={editorState.link.popup}/>}
						{!['web'].includes(props.viewMode) && editorState.highlight && <HighlightPopup parentRef={editorRef} highlightState={editorState.highlight} citationState={editorState.citation}/>}
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

export default Editor;
