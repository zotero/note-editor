import React from 'react';
import { createRoot } from 'react-dom/client';

import './fluent';
import Editor from './ui/editor';
import EditorCore from './core/editor-core';

let currentInstance = null;

class EditorInstance {
	constructor(options) {
		window._currentEditorInstance = this;
		this.instanceID = options.instanceID;
		this._readOnly = options.readOnly;
		this._editorCore = null;
		this._reactRoot = null;

		this._init(options.value);
	}

	_postMessage(message) {
		// window.parent.postMessage({ instanceID: this.instanceID, message }, '*');
		window.webkit.messageHandlers.textHandler.postMessage({ instanceID: this.instanceID, message });
	}

	_init(value) {
		this._editorCore = new EditorCore({
			value,
			readOnly: this._readOnly,
			unsaved: false,
			placeholder: '',
			isAttachmentNote: false,
			onSubscribe: (subscription) => {
				let { id, type, data } = subscription;
				subscription = { id, type, data };
				this._postMessage({ action: 'subscribe', subscription });
			},
			onUnsubscribe: (subscription) => {
				let { id, type } = subscription;
				this._postMessage({ action: 'unsubscribe', id, type });
			},
			onImportImages: (images) => {
				// this._postMessage({ action: 'importImages', images });
			},
			onUpdate: () => {
				let data = this._editorCore.getData();
				if (data) {
					this._postMessage({ action: 'update', value: data.html });
				}
			},
			onInsertObject: (type, data, pos) => {
				// this._postMessage({ action: 'insertObject', type, data, pos });
			},
			onUpdateCitationItemsList: (list) => {
				// this._postMessage({ action: 'updateCitationItemsList', list });
			},
			onOpenURL: (url) => {
				this._postMessage({ action: 'openURL', url });
			},
			onOpenAnnotation: (annotation) => {
				this._postMessage({
					action: 'openAnnotation',
					attachmentURI: annotation.attachmentURI,
					position: annotation.position
				});
			},
			onOpenCitationPage: (citation) => {
				this._postMessage({ action: 'openCitationPage', citation });
			},
			onShowCitationItem: (citation) => {
				this._postMessage({ action: 'showCitationItem', citation });
			},
			onOpenCitationPopup: (nodeID, citation) => {
				// this._postMessage({ action: 'openCitationPopup', nodeID, citation });
			},
			onOpenContextMenu: (pos, node, x, y) => {
				// this._postMessage({ action: 'openContextMenu', x, y, pos, itemGroups: this._getContextMenuItemGroups(node) });
			}
		});

		if (this._editorCore.unsupportedSchema) {
			this._readOnly = true;
		}

		this._reactRoot = createRoot(document.getElementById('editor-container'));
		this._reactRoot.render(
			<Editor
				readOnly={this._readOnly}
				disableUI={false}
				enableReturnButton={false}
				viewMode="android"
				showUpdateNotice={this._editorCore.unsupportedSchema}
				editorCore={this._editorCore}
				onClickReturn={() => {
				}}
				onShowNote={() => {
					this._postMessage({ action: 'showNote' });
				}}
				onOpenWindow={() => {

				}}
			/>
		);
		window.addEventListener('message', this._messageHandler);
		this._postMessage({ action: 'initialized' });
	}

	uninit() {
		window.removeEventListener('message', this._messageHandler);
		this._reactRoot.unmount();
	}

	_messageHandler = (event) => {
		if (event.data.instanceID !== this.instanceID) {
			return;
		}

		let message = event.data.message;
		switch (message.action) {
			case 'notifySubscription': {
				let { id, data } = message;
				this._editorCore.provider.notify(id, data);
				return;
			}
			case 'forceSave': {
				let data = this._editorCore.getData(true);
				this._postMessage({ action: 'update', value: data ? data.html : null });
				return;
			}
			// case 'setCitation': {
			// 	let { nodeID, citation, formattedCitation } = message;
			// 	this._editorCore.setCitation(nodeID, citation, formattedCitation);
			// 	return;
			// }
			// case 'updateCitationItems': {
			// 	let { citationItems } = message;
			// 	this._editorCore.updateCitationItems(citationItems);
			// 	return;
			// }
			// case 'attachImportedImage': {
			// 	let { nodeID, attachmentKey } = message;
			// 	this._editorCore.attachImportedImage(nodeID, attachmentKey);
			// 	return;
			// }
			// case 'insertHTML': {
			// 	let { pos, html } = message;
			// 	this._editorCore.insertHTML(pos, html);
			// 	return;
			// }
		}
	}
}

window.addEventListener('message', function (e) {
	console.log('message', e.data)
	let message = e.data.message;
	let instanceID = e.data.instanceID;

	if (message.action === 'init') {
		// console.log('Initializing a new instance', message);
		if (currentInstance) {
			currentInstance.uninit();
		}

		currentInstance = new EditorInstance({ instanceID, ...message });
	}
});


window.webkit.messageHandlers.textHandler.postMessage({ action: 'initialized' }, '*');
