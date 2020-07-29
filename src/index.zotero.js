import React from 'react';
import ReactDOM from 'react-dom';

import { DOMSerializer } from 'prosemirror-model'

import { randomString } from './core/utils';
import { schema } from './core/schema';
import * as commands from './core/commands';
import Editor from './ui/editor';
import EditorCore from './core/editor-core';


class EditorInstance {
  constructor(options) {
    this.editorCore = null;
    this.instanceId = options.instanceId;
    this.libraryId = options.libraryId;
    this.readOnly = options.readOnly;
    if (options.state) {
      this.init(options.state);
    }
    else {
      this.init(options.html);
    }
  }

  postMessage(message) {
    console.log('posting', message)
    window.postMessage({ instanceId: this.instanceId, message }, '*');
  }

  init(value) {
    this.editorCore = new EditorCore({
      value,
      readOnly: this.readOnly,
      onUpdate: (html) => {
        console.log('onUpdate');
        this.postMessage({
          op: 'update',
          noteData: {
            state: {
              doc: this.editorCore.view.state.doc.toJSON()
            },
            html: this.editorCore.getHtml() || null
          }
        });
      },
      onUpdateCitations: (id, citation) => {
        this.postMessage({ op: 'updateCitation', id, citation });
      },
      onInsertObject: (type, data, pos) => {
        console.log('onInsertObject', type, data, pos);
        this.postMessage({ op: 'insertObject', type, data, pos });
      },
      onNavigate: (annotation) => {
        console.log('onNavigate', annotation)
        this.postMessage({ op: 'navigate', uri: annotation.uri, position: annotation.position });

      },
      onOpenCitationPopup: (id, citation) => {
        console.log('onOpenCitationPopup', id, citation);
        this.postMessage({ op: 'quickFormat', id, citation });
      },
      onUpdateImages: (data) => {
        console.log('onUpdateImages', data)
        this.postMessage({ op: 'updateImages', ...data });
      },
      onRequestImage: (attachmentKey) => {
        console.log('onRequestImage', attachmentKey)
        this.postMessage({ op: 'requestImage', attachmentKey });
      },
      onGetFormattedCitations: (citations) => {
        console.log('onGetFormattedCitations', citations);
        this.postMessage({ op: 'getFormattedCitations', citations });
      }
    });

    ReactDOM.render(
      <Editor
        readOnly={this.readOnly}
        editorCore={this.editorCore}
        onOpenUrl={(url) => {
          console.log('onOpenUrl', url);
          this.postMessage({ op: 'openURL', url });
        }}
      />,
      document.getElementById('editor-container')
    );

    window.addEventListener('message', this.listener);
    window.addEventListener('mousedown', this.handleMouseDown);

    this.postMessage({ op: 'initialized' });
  }

  uninit() {
    window.removeEventListener('message', this.listener);
    window.removeEventListener('mousedown', this.handleMouseDown);
    ReactDOM.unmountComponentAtNode(document.getElementById('editor-container'));
  }

  handleMouseDown = (event) => {
    // If right button
    if (event.button === 2) {
      currentInstance.postMessage({
        op: 'popup',
        x: event.screenX,
        y: event.screenY,
        items: this.getContextMenuItems()
      });
    }
  }

  listener = (event) => {
    console.log('Worker: Message received from the main script');
    console.log(event);

    if (event.data.instanceId !== this.instanceId) {
      return;
    }

    let message = event.data.message;

    if (message.op === 'setFormattedCitations') {
      this.editorCore.setFormattedCitations(message.formattedCitations);
    }
    else if (message.op === 'setCitation') {
      this.editorCore.updateCitation(message.id, message.citation, message.formattedCitation);
    }
    else if (message.op === 'updateImage') {
      this.editorCore.updateImage(message.attachmentKey, message.dataUrl);
    }
    else if (message.op === 'contextMenuAction') {
      this.handleContextMenuAction(message.ctxAction, message.payload);
    }
    else if (message.op === 'insertCitations') {
      this.editorCore.insertCitations(message.citations, message.pos);
    }
    else if (message.op === 'insertAnnotationsAndCitations') {
      this.editorCore.insertAnnotationsAndCitations(message.list, message.pos);
    }
  }

  handleContextMenuAction(cmd) {
    console.log('contextMenuCmd', cmd);
    if (cmd === 'navigate') {
      if (this.editorCore.lastMouseDownNode.classList.contains('highlight')) {
        let uri = this.editorCore.lastMouseDownNode.getAttribute('data-item-uri');
        let annotation = JSON.parse(decodeURIComponent(this.editorCore.lastMouseDownNode.getAttribute('data-annotation')));
        this.postMessage({ op: 'navigate', navigateItemURI: uri, annotation });
      }
    }
    else if (cmd === 'showInLibrary') {
      if (this.editorCore.lastMouseDownNode && this.editorCore.lastMouseDownNode.classList.contains('highlight')) {
        let uri = this.editorCore.lastMouseDownNode.getAttribute('data-item-uri');
        if (uri) {
          this.postMessage({ op: 'showInLibrary', itemURI: uri });
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
      this.editorCore.view.dispatch(this.editorCore.view.state.tr.insert(this.editorCore.view.state.selection.from, citationNode));
      this.postMessage({ op: 'quickFormat', id, citation });
    }
    else if (cmd === 'toggleDir') {
      commands.toggleDir(window.rtl ? 'ltr' : 'rtl')(this.editorCore.view.state, this.editorCore.view.dispatch);
    }
  }

  getContextMenuItems() {
    let items = [];

    let selection = currentInstance.editorCore.view.state.doc.cut(currentInstance.editorCore.view.state.selection.from, currentInstance.editorCore.view.state.selection.to)
    if (selection.content.size) {
      items.push(['cut', 'Cut']);
      items.push(['copy', 'Copy']);
    }

    items.push(['paste', 'Paste']);


    if (
      // editorCore.lastMouseDownNode.classList.contains('citation') ||
      currentInstance.editorCore.lastMouseDownNode.classList.contains('highlight')
    ) {
      items.push(['showInLibrary', 'Show Item in Library']);
    }

    if (currentInstance.editorCore.lastMouseDownNode.classList.contains('highlight')) {
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

}

let currentInstance = null;

window.addEventListener('message', function (e) {
  // console.log('Editor: Message received from the main script');
  // console.log(e);
  let message = e.data.message;
  let instanceId = e.data.instanceId;

  if (message.op === 'init') {
    if (currentInstance) {
      currentInstance.uninit();
    }
    currentInstance = new EditorInstance({
      instanceId,
      html: message.html,
      state: message.state,
      libraryId: message.libraryId,
      readOnly: message.readOnly
    });
  }
});


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

window.getDataSync = () => {
  if (!currentInstance.editorCore.docChanged) {
    return null;
  }

  return {
    state: {
      doc: currentInstance.editorCore.view.state.doc.toJSON()
    },
    html: currentInstance.editorCore.getHtml() || null
  };
}

window.setHTML = (html) => {
  console.log('Setting HTML', html);
  // init(html, null);
}

window.setState = (state) => {
  console.log('Setting state', state);
  state = JSON.parse(state);
  // init(null, state);
}

window.isReady = true;
