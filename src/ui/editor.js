'use strict';

import React, { useRef, useState, useLayoutEffect, useEffect, Fragment } from 'react';

import Toolbar from './toolbar';
import Findbar from './findbar';
import LinkPopup from './link-popup';
import Noticebar from './noticebar';
import HighlightPopup from './highlight-popup';
import CitationPopup from './citation-popup';
import ImagePopup from './image-popup';

function Editor(props) {
	const editorRef = useRef(null);
	const [editorState, setEditorState] = useState(props.editorCore.pluginState);

	const [refReady, setRefReady] = useState(false)
	useEffect(() => {
		setRefReady(true)
	}, [])

	useLayoutEffect(() => {
		props.editorCore.onUpdateState = (state) => {
			setEditorState(props.editorCore.pluginState);
		}
		editorRef.current.appendChild(props.editorCore.view.dom);
	}, []);

	return (
		<div className="editor">
			{!props.readOnly && <Toolbar
				enableReturnButton={props.enableReturnButton}
				menuState={editorState.menu}
				linkState={editorState.link}
				searchState={editorState.search}
				onClickReturn={props.onClickReturn}
			/>}
			<Findbar searchState={editorState.search} active={editorState.search.active}/>
			{props.showUpdateNotice &&
			<Noticebar>Please update Zotero to edit the note</Noticebar>}
			<div className="editor-core" ref={editorRef}>
				<div className="relative-container">
					{refReady && <Fragment>
						{editorState.link &&
						<LinkPopup parentRef={editorRef} linkState={editorState.link.popup}/>}
						{editorState.highlight && <HighlightPopup parentRef={editorRef} pluginState={editorState.highlight.popup}/>}
						{editorState.image && <ImagePopup parentRef={editorRef} pluginState={editorState.image.popup}/>}
						{editorState.citation && <CitationPopup parentRef={editorRef} pluginState={editorState.citation.popup}/>}
					</Fragment>}
				</div>
			</div>
		</div>
	);
}

export default Editor;
