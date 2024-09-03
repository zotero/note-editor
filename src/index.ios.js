import React from 'react';
import { createRoot } from 'react-dom/client';
import { IntlProvider } from 'react-intl';

import Editor from './ui/editor';
import EditorCore from './core/editor-core';
import strings from './en-us.strings';

let currentInstance = null;

class EditorInstance {
	constructor(options) {
		window._currentEditorInstance = this;
		this.instanceID = options.instanceID;
		this._readOnly = options.readOnly;
		this._localizedStrings = strings;
		this._editorCore = null;
		this._reactRoot = null;
		window.localizedStrings = strings;

		this._init(options.value);
	}

	_getLocalizedString(key) {
		let string = this._localizedStrings[key];
		return string || key;
	}

	_postMessage(message) {
		window.webkit.messageHandlers.messageHandler.postMessage(message);
	}

	_init(value) {
		this._editorCore = new EditorCore({
			value,
			mode: 'ios',
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
				this._postMessage({ action: 'importImages', images });
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
			<IntlProvider
				locale={window.navigator.language}
				messages={strings}
			>
				<Editor
					readOnly={this._readOnly}
					disableUI={false}
					enableReturnButton={false}
					viewMode="ios"
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
			</IntlProvider>
		);
		this._postMessage({ action: 'readerInitialized' });
	}

	uninit() {
		window.removeEventListener('message', this._messageHandler);
		this._reactRoot.unmount();
	}
}

// Prevent zoom on double-tap
document.addEventListener('dblclick', function(event) {
	event.preventDefault();
}, { passive: false });

function scrollCaretIntoView(container) {
	function adjustScroll(rect, containerRect, container) {
		if (rect.bottom > containerRect.bottom) {
			container.scrollTop += (rect.bottom - containerRect.bottom);
		} else if (rect.top < containerRect.top) {
			container.scrollTop -= (containerRect.top - rect.top);
		}

		if (rect.right > containerRect.right) {
			container.scrollLeft += (rect.right - containerRect.right);
		} else if (rect.left < containerRect.left) {
			container.scrollLeft -= (containerRect.left - rect.left);
		}
	}

	let selection = window.getSelection();
	if (!selection.rangeCount) return; // No selection

	let range = selection.getRangeAt(0);
	let isCollapsed = selection.isCollapsed;

	if (isCollapsed) {
		// Use a temporary span to measure the position of the caret
		let span = document.createElement('span');
		// This span is used as a caret position marker
		span.style.display = 'inline-block';
		span.style.width = '0';
		span.style.height = '0';

		// Insert the span at the caret's position
		range.insertNode(span);
		span.parentNode.insertBefore(span, span.nextSibling);

		// Measure the span's position relative to the container
		let rect = span.getBoundingClientRect();
		let containerRect = container.getBoundingClientRect();

		// Cleanup: remove the span and restore the selection
		span.parentNode.removeChild(span);
		// The range can get messed up after DOM manipulation, so it needs to be reset
		selection.removeAllRanges();
		selection.addRange(range);

		// Scroll if necessary
		adjustScroll(rect, containerRect, container);
	} else {
		// For normal range selection, measure the bounding rectangle
		let rect = range.getBoundingClientRect();
		let containerRect = container.getBoundingClientRect();
		adjustScroll(rect, containerRect, container);
	}
}

document.addEventListener('click', (event) => {
	if (event.target.closest('.primary-editor')) {
		setTimeout(() => {
			scrollCaretIntoView(document.querySelector('.editor-core'));
		}, 300);
	}
});

// _messageHandler = (event) => {
// 		if (event.data.instanceID !== this.instanceID) {
// 			return;
// 		}
// 		let message = event.data.message;
// 		switch (message.action) {
// 			case 'notifySubscription': {
// 				let { id, data } = message;
// 				this._editorCore.provider.notify(id, data);
// 				return;
// 			}
// 			// case 'setCitation': {
// 			// 	let { nodeID, citation, formattedCitation } = message;
// 			// 	this._editorCore.setCitation(nodeID, citation, formattedCitation);
// 			// 	return;
// 			// }
// 			// case 'updateCitationItems': {
// 			// 	let { citationItems } = message;
// 			// 	this._editorCore.updateCitationItems(citationItems);
// 			// 	return;
// 			// }
// 			// case 'insertHTML': {
// 			// 	let { pos, html } = message;
// 			// 	this._editorCore.insertHTML(pos, html);
// 			// 	return;
// 			// }
// 		}
// 	}

window.attachImportedImage = encodedMessage => {
	let message = JSON.parse(decodeBase64(encodedMessage));
	let { nodeID, attachmentKey } = message;
	log("Attach imported node: " + nodeID + "; key: " + attachmentKey);
	currentInstance._editorCore.attachImportedImage(nodeID, attachmentKey);
}

window.notifySubscription = encodedMessage => {
	let message = JSON.parse(decodeBase64(encodedMessage));
	let { id, data } = message;
	log("Notify subscription: " + id);
	currentInstance._editorCore.provider.notify(id, data);
}

window.start = encodedMessage => {
	let message = JSON.parse(decodeBase64(encodedMessage));
	if (currentInstance) {
		currentInstance.uninit();
	}
	currentInstance = new EditorInstance({ instanceID: 1, ...message });
}

function decodeBase64(base64) {
     const text = atob(base64);
     const length = text.length;
     const bytes = new Uint8Array(length);
     for (let i = 0; i < length; i++) {
         bytes[i] = text.charCodeAt(i);
     }
     const decoder = new TextDecoder();
     return decoder.decode(bytes);
 }

 function log(message) {
	window.webkit.messageHandlers.logHandler.postMessage(message);
 }


window.webkit.messageHandlers.messageHandler.postMessage({ action: 'initialized' });
