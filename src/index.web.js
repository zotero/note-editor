import React from 'react';
import ReactDOM from 'react-dom';
import { IntlProvider } from 'react-intl';

import Editor from './ui/editor';
import EditorCore from './core/editor-core';
import strings from './en-us.strings';

window.localizedStrings = strings;


let currentInstance = null;

class EditorInstance {
	constructor(options) {
		window._currentEditorInstance = this;
		this.instanceID = options.instanceID;
		this._readOnly = options.readOnly;
		this._disableDrag = options.disableDrag;
		this._localizedStrings = options.localizedStrings;
		this._editorCore = null;

		this._init(options.value);
	}

	getDataSync(onlyChanged) {
		return this._editorCore.getData(onlyChanged);
	}

	_getLocalizedString(key) {
		let string = this._localizedStrings[key];
		return string || key;
	}

	_postMessage(message) {
		window.postMessage({ instanceID: this.instanceID, message }, '*');
	}

	_init(value) {
		this._editorCore = new EditorCore({
			value,
			readOnly: this._readOnly,
			disableDrag: this._disableDrag,
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
				images = images.filter(x => x.src.startsWith('data:'));
				if (images.length) {
					this._postMessage({ action: 'importImages', images });
				}
			},
			onUpdate: () => {
				let data = this._editorCore.getData();
				if (data) {
					this._postMessage({ action: 'update', value: data.html });
				}
			},
			onInsertObject: (type, data, pos) => {
				this._postMessage({ action: 'insertObject', type, data, pos });
			},
			onUpdateCitationItemsList: (list) => {
				this._postMessage({ action: 'updateCitationItemsList', list });
			},
			onOpenURL: (url) => {
				window.open(url, '_blank');
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
				this._postMessage({ action: 'openCitationPopup', nodeID, citation });
			},
			onOpenContextMenu: (pos, node, x, y) => {
				this._postMessage({ action: 'openContextMenu', x, y, pos, itemGroups: this._getContextMenuItemGroups(node) });
			}
		});

		if (this._editorCore.unsupportedSchema) {
			this._readOnly = true;
		}

		ReactDOM.render(
			<IntlProvider
				locale={window.navigator.language}
				messages={strings}
			>
				<Editor
					readOnly={this._readOnly}
					disableUI={false}
					enableReturnButton={false}
					viewMode="web"
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
			</IntlProvider>,
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
		if (event.source !== window.parent) {
			return;
		}
		let message = event.data;
		switch (message.action) {
			case 'notifySubscription': {
				let { id, data } = message;
				this._editorCore.provider.notify(id, data);
				return;
			}
			case 'attachImportedImage': {
				let { nodeID, attachmentKey } = message;
				this._editorCore.attachImportedImage(nodeID, attachmentKey);
				return;
			}
			case 'focus': {
				this._editorCore.focus();
			}
		}
	};
}

window.getDataSync = (onlyChanged) => {
	if (currentInstance) {
		const data = currentInstance.getDataSync(onlyChanged);
		if (data) {
			return { instanceID: currentInstance.instanceID, data };
		}
	}
	return null;
};

window.addEventListener('message', function (event) {
	if (event.source !== window.parent) {
		return;
	}
	let message = event.data;
	if (message.action === 'init') {
		if (currentInstance) {
			currentInstance.uninit();
		}
		currentInstance = new EditorInstance(message);
	}
});
