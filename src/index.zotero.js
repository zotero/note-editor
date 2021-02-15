import React from 'react';
import ReactDOM from 'react-dom';

import { randomString } from './core/utils';
import { schema } from './core/schema';
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
    this._placeholder = options.placeholder;
    this._dir = window.dir = options.dir;
    this._hasBackup = options.hasBackup;
    this._enableReturnButton = options.enableReturnButton;
    this._editorCore = null;

    this._setFont(options.font);
    this._init(options.value);
  }

  getDataSync(onlyChanged) {
    return this._editorCore.getData(onlyChanged);
  }

  _setFont(font) {
    let root = document.documentElement;
    root.style.setProperty('--font-family', font.fontFamily);
    root.style.setProperty('--font-size', font.fontSize + 'px');
  }

  _postMessage(message) {
    // console.log(message)
    window.postMessage({ instanceId: this.instanceId, message }, '*');
  }

  _init(value) {
    this._editorCore = new EditorCore({
      value,
      readOnly: this._readOnly,
      placeholder: this._placeholder,
      onSubscribeProvider: (subscription) => {
        let { id, type, nodeId, data } = subscription;
        subscription = { id, type, nodeId, data };
        this._postMessage({ action: 'subscribeProvider', subscription });
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
      onGenerateCitation: (citation, pos) => {
        this._postMessage({ action: 'generateCitation', citation, pos });
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
      onOpenCitation: (citation) => {
        this._postMessage({ action: 'openCitation', citation });
      },
      onOpenCitationPopup: (nodeId, citation) => {
        this._postMessage({ action: 'openCitationPopup', nodeId, citation });
      },
      onOpenContextMenu: (pos, node, x, y) => {
        this._postMessage({ action: 'openContextMenu', x, y, pos, itemGroups: this._getContextMenuItemGroups(node) });
      }
    });

    document.body.dir = this._dir;

    if (this._editorCore.unsupportedSchema) {
      this._readOnly = true;
    }

    ReactDOM.render(
      <Editor
        readOnly={this._readOnly}
        enableReturnButton={this._enableReturnButton}
        showUpdateNotice={this._editorCore.unsupportedSchema}
        editorCore={this._editorCore}
        onClickReturn={() => {
          this._postMessage({ action: 'return' });
        }}
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
    // console.log('Message received from the main script', event);

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
        let { nodeId, citation, formattedCitation } = message;
        this._editorCore.setCitation(nodeId, citation, formattedCitation);
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
      case 'insertHtml': {
        let { pos, html } = message;
        this._editorCore.insertHtml(pos, html);
        return;
      }
      case 'focus': {
        this._editorCore.focus();
        return;
      }
      case 'updateFont': {
        let { font } = message;
        this._setFont(font);
        return;
      }
    }
  }

  _handleContextMenuAction(action, pos) {
    let $pos = this._editorCore.view.state.doc.resolve(pos);
    let node = $pos.node();
    switch (action) {
      case 'editHighlight': {
        let nodeView = this._editorCore.getNodeView(pos);
        if (nodeView) {
          nodeView.open();
        }
        return;
      }
      case 'openAnnotation': {
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
      case 'rtl': {
        this._editorCore.pluginState.menu.rtl.run();
        return;
      }
      case 'ltr': {
        this._editorCore.pluginState.menu.ltr.run();
        return;
      }
    }
  }

  _getContextMenuItemGroups(node) {
    let groups = [
      [
        {
          name: 'cut',
          label: 'Cut',
          enabled: !this._readOnly && this._editorCore.hasSelection(),
          persistent: true
        },
        {
          name: 'copy',
          label: 'Copy',
          enabled: this._editorCore.hasSelection(),
          persistent: true
        },
        {
          name: 'paste',
          label: 'Paste',
          enabled: !this._readOnly,
          persistent: true
        }
      ],
      [
        {
          name: 'editHighlight',
          label: 'Edit',
          enabled: node.type.name === 'highlight'
        },
        {
          name: 'showInLibrary',
          label: 'Show in Library',
          enabled: node.type.name === 'highlight'
        },
        {
          name: 'openAnnotation',
          label: 'Show in PDF',
          enabled: node.type.name === 'highlight'
        },
        {
          name: 'insertCitation',
          label: 'Insert Citation',
          enabled: !this._readOnly && !this._editorCore.hasSelection()
        },
        {
          name: 'rtl',
          label: 'Right to Left',
          enabled: this._dir === 'ltr' && !this._editorCore.pluginState.menu.rtl.isActive
            || this._dir === 'rtl' && this._editorCore.pluginState.menu.ltr.isActive
        },
        {
          name: 'ltr',
          label: 'Left to Right',
          enabled: this._dir === 'ltr' && this._editorCore.pluginState.menu.rtl.isActive
            || this._dir === 'rtl' && !this._editorCore.pluginState.menu.ltr.isActive
        }
      ],
      [
        {
          name: 'openBackup',
          label: 'View note backup',
          enabled: this._hasBackup
        }
      ]
    ];

    return groups.map(items =>
      items.filter(item => item.enabled || item.persistent)
    ).filter(items => items.length);
  }
}

window.addEventListener('message', function (e) {
  // console.log('Editor: Message received from the main script');
  // console.log(e);
  let message = e.data.message;
  let instanceId = e.data.instanceId;

  if (message.action === 'init') {
    // console.log('Initializing a new instance', message);
    if (currentInstance) {
      currentInstance.uninit();
    }
    let { value, readOnly, placeholder, dir, font, hasBackup, enableReturnButton } = message;
    currentInstance = new EditorInstance({
      instanceId,
      value,
      readOnly,
      placeholder,
      dir,
      font,
      hasBackup,
      enableReturnButton
    });
  }
});

window.getDataSync = (onlyChanged) => {
  if (currentInstance) {
    return currentInstance.getDataSync(onlyChanged);
  }
  return null;
}
