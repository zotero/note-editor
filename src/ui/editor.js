'use strict';

import React, { useRef, useState, useLayoutEffect } from 'react';

import Toolbar from './toolbar';
import Findbar from './findbar';
import LinkPopup from './link-popup';
import Noticebar from './noticebar';

function Editor(props) {
  const editorRef = useRef(null);
  const [editorState, setEditorState] = useState(props.editorCore.pluginState);

  useLayoutEffect(() => {
    props.editorCore.onUpdateState = (state) => {
      setEditorState(props.editorCore.pluginState);
    }
    editorRef.current.appendChild(props.editorCore.view.dom);
  }, []);

  return (
    <div className="editor">
      <Toolbar menuState={editorState.menu} linkState={editorState.link} searchState={editorState.search}/>
      {editorState.search.active && <Findbar searchState={editorState.search}/>}
      {props.showUpdateNotice &&
      <Noticebar>Editor is in read-only mode. Please update Zotero to use the newest features</Noticebar>}
      <div className="editor-core" ref={editorRef}>
        <div className="relative-container">{editorState.link &&
        <LinkPopup parentRef={editorRef} linkState={editorState.link.popup}/>}</div>
      </div>
    </div>
  );
}

export default Editor;
