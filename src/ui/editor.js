'use strict';

import React, { useRef, useState, useLayoutEffect, useEffect, Fragment } from 'react';
import { useIntl } from 'react-intl';

import Toolbar from './toolbar';
import Findbar from './findbar';
import LinkPopup from './popups/link-popup';
import HighlightPopup from './popups/highlight-popup';
import CitationPopup from './popups/citation-popup';
import ImagePopup from './popups/image-popup';
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

	return (
		<div className="editor">
			{!props.disableUI && <Toolbar
				viewMode={props.viewMode}
				enableReturnButton={props.enableReturnButton}
				colorState={editorState.color}
				menuState={editorState.menu}
				linkState={editorState.link}
				citationState={editorState.citation}
				unsaved={editorState.core.unsaved}
				searchState={editorState.search}
				onClickReturn={props.onClickReturn}
				onShowNote={props.onShowNote}
				onOpenWindow={props.onOpenWindow}
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
						{editorState.link && <LinkPopup parentRef={editorRef} pluginState={editorState.link.popup}/>}
						{editorState.highlight && <HighlightPopup parentRef={editorRef} highlightState={editorState.highlight} citationState={editorState.citation}/>}
						{editorState.image && <ImagePopup parentRef={editorRef} imageState={editorState.image} citationState={editorState.citation}/>}
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
