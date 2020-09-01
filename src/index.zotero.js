import React from 'react';
import ReactDOM from 'react-dom';

import { randomString } from './core/utils';
import { schemaVersion, schema } from './core/schema';
import * as commands from './core/commands';
import Editor from './ui/editor';
import EditorCore from './core/editor-core';

let currentInstance = null;

// A workaround for broken dataTransfer.getData() when running in an XUL iframe.
// Allows ProseMirror to properly handle drop event
Element.prototype.addEventListenerPrev = Element.prototype.addEventListener;
Element.prototype.addEventListener = function (name, fn) {
  if (name === 'drop') {
    this.addEventListenerPrev('drop', function (event) {
        let dataTransfer = event.dataTransfer;
        Object.defineProperty(event, 'dataTransfer', {
          configurable: true,
          get() {
            return new Proxy(dataTransfer, {
              get(target, propKey) {
                let propValue = target[propKey];
                if (propKey === 'getData') {
                  return function (name) {
                    return window.droppedData[name];
                  }
                }
                if (typeof propValue !== 'function') {
                  return propValue;
                }
              }
            });
          }
        });
        fn(event);
      }
    );
  }
  return this.addEventListenerPrev(name, fn);
}

class EditorInstance {
  constructor(options) {
    this.instanceId = options.instanceId;
    this._readOnly = options.readOnly;
    this._dir = options.dir;
    this._editorCore = null;
    this._unsupportedSchema = false;

    if (!Number.isInteger(options.schemaVersion)) {
      throw new Error('schemaVersion is not an integer');
    }

    if (options.schemaVersion > schemaVersion) {
      this._readOnly = true;
      this._unsupportedSchema = true;
    }

    this._init(options.value);
  }

  getDataSync() {
    return this._editorCore.getData(true);
  }

  _postMessage(message) {
    console.log('posting', message)
    window.postMessage({ instanceId: this.instanceId, message }, '*');
  }

  _init(value) {
    this._editorCore = new EditorCore({
      value,
      readOnly: this._readOnly,
      onSubscribeProvider: (subscription) => {
        let { id, type, data } = subscription;
        this._postMessage({ action: 'subscribeProvider', id, type, data });
      },
      onUnsubscribeProvider: (subscription) => {
        let { id, type } = subscription;
        this._postMessage({ action: 'unsubscribeProvider', id, type });
      },
      onImportImages: (images) => {
        this._postMessage({ action: 'importImages', images });
      },
      onSyncAttachmentKeys: (attachmentKeys) => {
        this._postMessage({ action: 'syncAttachmentKeys', attachmentKeys });
      },
      onUpdate: (html) => {
        this._postMessage({ action: 'update', noteData: this._editorCore.getData() });
      },
      onInsertObject: (type, data, pos) => {
        this._postMessage({ action: 'insertObject', type, data, pos });
      },
      onOpenUrl: (url) => {
        this._postMessage({ action: 'openUrl', url });
      },
      onOpenAnnotation: (annotation) => {
        this._postMessage({ action: 'openAnnotation', uri: annotation.uri, position: annotation.position });
      },
      onOpenCitationPopup: (nodeId, citation) => {
        this._postMessage({ action: 'openCitationPopup', nodeId, citation });
      },
      onOpenContextMenu: (pos, node, x, y) => {
        this._postMessage({ action: 'openContextMenu', x, y, pos, items: this._getContextMenuItems(node) });
      }
    });

    document.body.dir = this._dir;

    ReactDOM.render(
      <Editor
        readOnly={this._readOnly}
        showUpdateNotice={this._unsupportedSchema}
        editorCore={this._editorCore}
      />,
      document.getElementById('editor-container')
    );
    window.addEventListener('message', this._messageHandler);
    this._postMessage({ action: 'initialized' });
  }

  uninit() {
    window.removeEventListener('message', this._messageHandler);
    ReactDOM.unmountComponentAtNode(document.getElementById('editor-container'));
  }

  _messageHandler = (event) => {
    console.log('Worker: Message received from the main script');
    console.log(event);

    if (event.data.instanceId !== this.instanceId) {
      return;
    }

    let message = event.data.message;
    switch (message.action) {
      case 'notifyProvider': {
        let { id, type, data } = message;
        this._editorCore.provider.notify(id, type, data);
        return;
      }
      case 'setCitation': {
        let { nodeId, citation } = message;
        this._editorCore.setCitation(nodeId, citation);
        return;
      }
      case 'attachImportedImage': {
        let { nodeId, attachmentKey } = message;
        this._editorCore.attachImportedImage(nodeId, attachmentKey);
        return;
      }
      case 'contextMenuAction': {
        let { ctxAction, pos } = message;
        this._handleContextMenuAction(ctxAction, pos);
        return;
      }
      case 'insertAnnotationsAndCitations': {
        let { list, pos } = message;
        this._editorCore.insertAnnotationsAndCitations(list, pos);
        return;
      }
      case 'focus': {
        this._editorCore.focus();
        return;
      }
    }
  }

  _handleContextMenuAction(action, pos) {
    let $pos = this._editorCore.view.state.doc.resolve(pos);
    let node = $pos.node();
    switch (action) {
      case 'navigate': {
        if (node.type.name === 'highlight') {
          let annotation = node.attrs.annotation;
          this._postMessage({ action: 'openAnnotation', uri: annotation.uri, position: annotation.position });
        }
        return;
      }
      case 'showInLibrary': {
        if (node.type.name === 'highlight') {
          let annotation = node.attrs.annotation;
          this._postMessage({ action: 'showInLibrary', uri: annotation.uri });
        }
        return;
      }
      case 'openBackup': {
        this._postMessage({ action: 'openBackup' });
        return;
      }
      case 'cut': {
        zoteroExecCommand(document, 'cut', false, null);
        return;
      }
      case 'copy': {
        zoteroExecCommand(document, 'copy', false, null);
        return;
      }
      case 'paste': {
        zoteroExecCommand(document, 'paste', false, null);
        return;
      }
      case 'insertCitation': {
        let citation = {
          citationItems: [],
          properties: {}
        };

        let nodeId = randomString();
        let citationNode = schema.nodes.citation.create({ nodeId, citation });
        let { state, dispatch } = this._editorCore.view;
        dispatch(state.tr.insert(pos, citationNode));
        this._postMessage({ action: 'openCitationPopup', nodeId, citation });
        return;
      }
      case 'toggleDir': {
        if (this._dir === 'ltr') {
          this._editorCore.pluginState.menu.rtl.run();
        }
        else if (this._dir === 'rtl') {
          this._editorCore.pluginState.menu.ltr.run();
        }
        return;
      }
    }
  }

  _getContextMenuItems(node) {
    let items = [];

    if (!this._readOnly && this._editorCore.hasSelection()) {
      items.push(['cut', 'Cut']);
    }

    if (this._editorCore.hasSelection()) {
      items.push(['copy', 'Copy']);
    }

    if (!this._readOnly) {
      items.push(['paste', 'Paste']);
    }

    if (node.type.name === 'highlight') {
      items.push(['showInLibrary', 'Show Item in Library']);
    }

    if (node.type.name === 'highlight') {
      items.push(['navigate', 'Show Annotation in PDF']);
    }

    // if (node.type.name === 'image') {
    //   items.push(['editImage', 'Edit Image']);
    // }

    if (!this._readOnly && !this._editorCore.hasSelection()) {
      items.push(['insertCitation', 'Insert Citation']);
    }

    if (!this._readOnly) {
      let toggleDir;
      if (this._dir === 'ltr') {
        toggleDir = this._editorCore.pluginState.menu.rtl.isActive ? 'ltr' : 'rtl'
      }
      else if (this._dir === 'rtl') {
        toggleDir = this._editorCore.pluginState.menu.ltr.isActive ? 'rtl' : 'ltr'
      }

      if (toggleDir === 'rtl') {
        items.push(['toggleDir', 'Right to Left']);
      }
      else if (toggleDir === 'ltr') {
        items.push(['toggleDir', 'Left to Right']);
      }
    }

    // TODO: Do not suggest backup preview for the new notes
    items.push(['openBackup', 'View note backup']);

    return items;
  }
}

window.addEventListener('message', function (e) {
  // console.log('Editor: Message received from the main script');
  // console.log(e);
  let message = e.data.message;
  let instanceId = e.data.instanceId;

  if (message.action === 'init') {
    console.log('Initializing a new instance', message);
    if (currentInstance) {
      currentInstance.uninit();
    }
    let { value, schemaVersion, readOnly, dir } = message;
    currentInstance = new EditorInstance({
      instanceId,
      value,
      schemaVersion,
      readOnly,
      dir
    });
  }
});

window.getDataSync = () => {
  if (currentInstance) {
    return currentInstance.getDataSync();
  }
  return null;
}
