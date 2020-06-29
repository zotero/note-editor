import React from 'react';
import ReactDOM from 'react-dom';

import { DOMSerializer } from 'prosemirror-model'

import { randomString } from './editor-core/utils';
import { schema } from './editor-core/schema';
import * as commands from './editor-core/commands';
import Editor from './components/editor';

(function f(self) {

  let promiseId = 0;
  let waitingPromises = {};

  self.query = async function (op, data) {
    return new Promise(function (resolve) {
      promiseId++;
      waitingPromises[promiseId] = resolve;
      self.postMessage({ id: promiseId, op, data }, '*');
    });
  };

  self.addEventListener('message', function (e) {
    console.log('Worker: Message received from the main script');
    console.log(e);
    let message = e.data;

    if (message.responseId) {
      let resolve = waitingPromises[message.responseId];
      if (resolve) {
        resolve(message.data);
      }
      return;
    }

    // if (message.op === 'open') {
    // 	let data = {};
    // 	init(message.data.itemId, message.data.html);
    // 	self.postMessage({responseId: message.id, data}, '*');
    // 	document.querySelector('.ProseMirror').setAttribute('contenteditable', !readOnly);
    // }

    if (message.op === 'updateFormattedCitations') {
      let data = { ok: 2 };
      self.postMessage({ responseId: message.id, data }, '*');
      editorCore.updateCitations(message.data.formattedCitations);
    }

    // if (message.op === 'reset') {
    // 	let data = {};
    // 	self.postMessage({responseId: message.id, data}, '*');
    // 	init(message.data.itemId, null, message.data.state);
    // 	document.querySelector('.ProseMirror').setAttribute('contenteditable', !readOnly);
    // }

    if (message.op === 'setCitation') {
      let data = { ok: 2 };
      let id = message.data.id;
      let citation = message.data.citation;
      self.postMessage({ responseId: message.id, data }, '*');
      editorCore.updateCitation(id, citation);
    }

    if (message.op === 'setReadOnly') {
      return;
      let enable = message.data;
      readOnly = enable;
      let data = { ok: 2 };
      let pmNode = document.querySelector('.ProseMirror');
      if (pmNode) {
        pmNode.setAttribute('contenteditable', !readOnly);
      }
      self.postMessage({ responseId: message.id, data }, '*');
    }
  });

  window.isEditorReady = true;
})(window);


window.contextMenuCmd = (cmd) => {
  console.log('contextMenuCmd', cmd);
  if (cmd === 'navigate') {
    if (editorCore.lastMouseDownNode.classList.contains('highlight')) {
      let uri = editorCore.lastMouseDownNode.getAttribute('data-item-uri');
      let annotation = JSON.parse(decodeURIComponent(editorCore.lastMouseDownNode.getAttribute('data-annotation')));
      query('navigate', { navigateItemURI: uri, annotation });
    }
  }
  else if (cmd === 'showInLibrary') {
    if (editorCore.lastMouseDownNode && editorCore.lastMouseDownNode.classList.contains('highlight')) {
      let uri = editorCore.lastMouseDownNode.getAttribute('data-item-uri');
      if (uri) {
        query('showInLibrary', { itemURI: uri });
      }
    }
  }
  else if (cmd === 'cut') {
    zoteroExecCommand(document, 'cut', false, null);
  }
  else if (cmd === 'copy') {
    zoteroExecCommand(document, 'copy', false, null);
  }
  else if (cmd === 'paste') {
    zoteroExecCommand(document, 'paste', false, null);
  }
  else if (cmd === 'insertCitation') {
    let citation = {
      citationItems: [],
      properties: {}
    };

    let id = randomString();
    let citationNode = schema.nodes.citation.create({ id, citation });

    view.dispatch(editor.state.tr.insert(editor.state.selection.from, citationNode));

    (async () => {
      let res = await query('quickFormat', { id, citation });
    })();


    // if (editorCore.lastMouseDownNode && editorCore.lastMouseDownNode.classList.contains('highlight')) {
    // 	let uri = editorCore.lastMouseDownNode.getAttribute('data-item-uri');
    // 	if (uri) {
    // 		query('insertCitation', {itemURI: uri});
    // 	}
    // }
  }
  else if (cmd === 'toggleDir') {
    commands.toggleDir(window.rtl ? 'ltr' : 'rtl')(editor.state, view.dispatch);
  }
}

window.setDir = (dir) => {
  return;
  if (dir === 'rtl') {
    document.getElementById('editor').setAttribute('dir', 'rtl');
    window.rtl = true;
  }
  else {
    document.getElementById('editor').removeAttribute('dir');
    window.rtl = false;
  }
}


window.getData = () => {
  return {
    state: {
      doc: editor.state.doc.toJSON()
    },
    html: getHTML() || null
  };
}

let editorCore = null;

function init(html, state) {


  ReactDOM.unmountComponentAtNode(document.getElementById('editor-container'));

  ReactDOM.render(
    <Editor
      html={html}
      state={state}
      onInit={(ec) => {
        editorCore = ec;
      }}
      onUpdate={() => {
        console.log('onUpdate');
        query('update', {});
      }}
      onOpenUrl={(url) => {
        console.log('onOpenUrl', url);
        query('openURL', { url });
      }}
      onUpdateCitations={(citations) => {
        console.log('onUpdateCitations', citations);
        query('updateCitations', { citations });
      }}
      onOpenCitationPopup={(id, citation) => {
        console.log('onOpenCitationPopup', id, citation);
        query('quickFormat', { id, citation });
      }}
      onInsertObject={async (type, data, pos) => {
        console.log('onInsertObject', type, data, pos);

        if (type === 'zotero/item') {
          let ids = data.split(',').map(id => parseInt(id));

          let citations = [];
          for (let id of ids) {
            citations.push(
              {
                citationItems: [
                  await query('getItemData', { itemId: id })
                ],
                properties: {}
              }
            );
          }

          editorCore.insertCitations(citations, pos);
        }
        else if (type === 'zotero/annotation') {
          let annotations = JSON.parse(data);

          let list = [];
          for (let annotation of annotations) {
            let pdfCitationItem = await query('getItemData', { itemId: annotation.itemId });
            let parentCitationItem = await query('getItemData', { itemId: annotation.itemId, parent: true });

            annotation.uri = pdfCitationItem.uri;

            let citation = {
              citationItems: [parentCitationItem || pdfCitationItem],
              properties: {}
            };

            citation.citationItems[0].locator = annotation.pageLabel;

            list.push({ annotation, citation });

          }

          editorCore.insertAnnotationsAndCitations(list, pos);

        }

        console.log('onInsertObject', type, data, pos);
      }}
      onNavigate={(uri, position) => {
        console.log('onNavigate', uri, position)
        query('navigate', { uri, position });
      }}
    />,
    document.getElementById('editor-container')
  );
};


window.setHTML = (html) => {
  console.log('Setting HTML', html);
  init(html, null);
}

window.setState = (state) => {
  console.log('Setting state', state);
  state = JSON.parse(state);
  init(null, state);
}

window.getContextMenuItems = () => {

  let items = [];

  let selection = editor.state.doc.cut(editor.state.selection.from, editor.state.selection.to)
  if (selection.content.size) {
    items.push(['cut', 'Cut']);
    items.push(['copy', 'Copy']);
  }

  items.push(['paste', 'Paste']);


  if (
    // editorCore.lastMouseDownNode.classList.contains('citation') ||
    editorCore.lastMouseDownNode.classList.contains('highlight')
  ) {
    items.push(['showInLibrary', 'Show Item in Library']);
  }

  if (editorCore.lastMouseDownNode.classList.contains('highlight')) {
    items.push(['navigate', 'Show Annotation in PDF']);
  }


  if (!selection.content.size) {
    items.push(['insertCitation', 'Insert Citation']);
  }

  if (window.rtl) {
    items.push(['toggleDir', 'Left to Right']);
  }
  else {
    items.push(['toggleDir', 'Right to Left']);
  }

  return items;
}

window.getHTML = function () {
  if (editorCore) {
    return editorCore.getHTML();
  }

  return '';
}
