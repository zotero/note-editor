'use strict';

import React, { useRef, useState, useLayoutEffect } from 'react';

import EditorCore from '../editor-core/editor';
import menu from '../editor-core/menu';
import Toolbar from './toolbar';
import Findbar from './findbar';
import Popup from './popup';

function Editor(props) {
  const editorRef = useRef(null);
  const [view, setView] = useState(null);
  const [linkPopupRect, setLinkPopupRect] = useState(null);

  useLayoutEffect(() => {
    console.log(editorRef.current)
    let editorCore = new EditorCore({
      container: editorRef.current,
      html: props.html && props.html,
      state: props.state && props.state,
      onUpdateView(view) {
        console.log('update view')
        setView({ ...view });
      },
      onUpdate: props.onUpdate,
      onOpenUrl: props.onOpenUrl,
      onUpdateCitations: props.onUpdateCitations,
      onInsertObject: props.onInsertObject,
      onNavigate: props.onNavigate,
      onOpenCitationPopup: props.onOpenCitationPopup
    });
    window.view = editorCore.view;
    setView(editorCore.view);
    props.onInit(editorCore);
    return () => {
      editorCore.view.destroy();
    }
  }, []);

  return (
    <div className="editor">
      {view && <Toolbar view={view} menu={menu}/>}
      {/*{view && <Findbar view={view}/>}*/}
      <div className="editor-core" ref={editorRef}>
        {/*<Popup className="link-popup" position={{}}>Link popup</Popup>*/}
      </div>
    </div>
  );
}

export default Editor;
