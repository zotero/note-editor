import React from 'react';
import { createRoot } from 'react-dom/client';

import { addFTL, getLocalizedString } from './fluent';
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
								};
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
};

// Prevent context menu on UI elements that are not text inputs
window.addEventListener('contextmenu', (e) => {
	const target = e.target;
	if (target?.closest?.('input, textarea, [contenteditable]')) {
		return;
	}
	e.preventDefault();
	e.stopPropagation();
});

class EditorInstance {
	constructor(options) {
		window._currentEditorInstance = this;
		this.instanceID = options.instanceID;
		this._reloaded = options.reloaded;
		this._viewMode = options.viewMode;
		this._readOnly = options.readOnly;
		this._unsaved = options.unsaved;
		this._disableUI = options.disableUI;
		this._placeholder = options.placeholder;
		this._dir = window.dir = options.dir;
		this._enableReturnButton = options.enableReturnButton;
		this._contextPaneButtonMode = options.contextPaneButtonMode;
		this._isAttachmentNote = options.isAttachmentNote;
		this._smartQuotes = options.smartQuotes;
		this._editorCore = null;
		this._reactRoot = null;

		if (Array.isArray(options.ftl)) {
			for (let ftl of options.ftl) {
				addFTL(ftl);
			}
		}

		this._setFont(options.font);
		if (options.style) {
			this._setStyle(options.style);
		}
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

	_setStyle(style) {
		let node = document.querySelector('head > style');
		if (!node) {
			node = document.createElement("style");
			document.head.appendChild(node);
		}
		node.innerHTML = style;
	}

	_focusToolbar() {
		document.querySelector('.toolbar button').focus();
	}

	_setToggleContextPaneButtonMode(mode) {
		this._contextPaneButtonMode = mode;
		if (this._editorCore && this._editorCore.setContextPaneButtonMode) {
			this._editorCore.setContextPaneButtonMode(mode);
		}
	}

	_postMessage(message) {
		window.postMessage({ instanceID: this.instanceID, message }, '*');
	}

	_init(value) {
		this._editorCore = new EditorCore({
			value,
			reloaded: this._reloaded,
			readOnly: this._readOnly,
			unsaved: this._unsaved,
			placeholder: this._placeholder,
			isAttachmentNote: this._isAttachmentNote,
			smartQuotes: this._smartQuotes,
			onSubscribe: (subscription) => {
				let { id, type, nodeID, data } = subscription;
				subscription = { id, type, nodeID, data };
				this._postMessage({ action: 'subscribe', subscription });
			},
			onUnsubscribe: (subscription) => {
				let { id, type } = subscription;
				this._postMessage({ action: 'unsubscribe', id, type });
			},
			onImportImages: (images) => {
				this._postMessage({ action: 'importImages', images });
			},
			onUpdate: (system) => {
				let noteData = this._editorCore.getData();
				this._postMessage({ action: 'update', noteData, system });
			},
			onInsertObject: (type, data, pos) => {
				this._postMessage({ action: 'insertObject', type, data, pos });
			},
			onUpdateCitationItemsList: (list) => {
				this._postMessage({ action: 'updateCitationItemsList', list });
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
				this._postMessage({ action: 'openCitationPopup', nodeID, citation });
			},
			onOpenContextMenu: (pos, node, x, y) => {
				this._postMessage({ action: 'openContextMenu', x, y, pos, itemGroups: this._getContextMenuItemGroups(node) });
			}
		});

		document.getElementsByTagName("html")[0].dir = this._dir;

		if (this._editorCore.unsupportedSchema) {
			this._readOnly = true;
		}

		this._reactRoot = createRoot(document.getElementById('editor-container'));
		this._reactRoot.render(
			<Editor
				readOnly={this._readOnly}
				disableUI={this._disableUI}
				// TODO: Rename this to something like 'inContextPane`
				enableReturnButton={this._enableReturnButton}
				contextPaneButtonMode={this._contextPaneButtonMode}
				viewMode={this._viewMode}
				showUpdateNotice={this._editorCore.unsupportedSchema}
				editorCore={this._editorCore}
				onClickReturn={() => {
					this._postMessage({ action: 'return' });
				}}
				onToggleContextPane={() => {
					this._postMessage({ action: 'toggleContextPane' });
				}}
				onFocusBack={() => {
					this._postMessage({ action: 'focusBack' });
				}}
				onFocusForward={() => {
					this._postMessage({ action: 'focusForward' });
				}}
				onShowNote={() => {
					this._postMessage({ action: 'showNote' });
				}}
				onOpenWindow={() => {
					this._postMessage({ action: 'openWindow' });
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
			case 'setCitation': {
				let { nodeID, citation, formattedCitation } = message;
				this._editorCore.setCitation(nodeID, citation, formattedCitation);
				return;
			}
			case 'updateCitationItems': {
				let { citationItems } = message;
				this._editorCore.updateCitationItems(citationItems);
				return;
			}
			case 'updateIncrementally': {
				let { noteData, preserveSelection } = message;
				let success = false;
				try {
					success = this._editorCore.applyExternalChanges(noteData, preserveSelection);
				} catch (e) {
					success = false;
				}
				
				if (!success) {
					// Notify parent that incremental update failed
					this._postMessage({ action: 'incrementalUpdateFailed' });
				}
				return;
			}
			case 'attachImportedImage': {
				let { nodeID, attachmentKey } = message;
				this._editorCore.attachImportedImage(nodeID, attachmentKey);
				return;
			}
			case 'contextMenuAction': {
				let { ctxAction, pos } = message;
				this._handleContextMenuAction(ctxAction, pos);
				return;
			}
			case 'insertHTML': {
				let { pos, html } = message;
				this._editorCore.insertHTML(pos, html);
				return;
			}
			case 'focus': {
				this._editorCore.focus();
				return;
			}
			case 'focusToolbar': {
				this._focusToolbar();
				return;
			}
			case 'setFont': {
				let { font } = message;
				this._setFont(font);
				return;
			}
			case 'setStyle': {
				let { style } = message;
				this._setStyle(style);
				return;
			}
			case 'setToggleContextPaneButtonMode': {
				let { mode } = message;
				this._setToggleContextPaneButtonMode(mode);
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
					this._postMessage({
						action: 'openAnnotation',
						attachmentURI: annotation.attachmentURI,
						position: annotation.position
					});
				}
				return;
			}
			// case 'showInLibrary': {
			// 	if (node.type.name === 'highlight') {
			// 		let annotation = node.attrs.annotation;
			// 		this._postMessage({ action: 'showInLibrary', uri: annotation.uri });
			// 	}
			// 	return;
			// }
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
			case 'rtl': {
				this._editorCore.pluginState.menu.rtl.run();
				return;
			}
			case 'ltr': {
				this._editorCore.pluginState.menu.ltr.run();
				return;
			}
			case 'alignLeft': {
				this._editorCore.pluginState.menu.alignLeft.run();
				return;
			}
			case 'alignCenter': {
				this._editorCore.pluginState.menu.alignCenter.run();
				return;
			}
			case 'alignRight': {
				this._editorCore.pluginState.menu.alignRight.run();
				return;
			}
			case 'insertMath': {
				this._editorCore.insertMath();
				return;
			}
			// window.openImageFilePicker will be called over eval, because it has to be a user-initiated event
			// case 'insertImage': {
			// 	return;
			// }
			case 'insertCitation': {
				this._editorCore.pluginState.citation.insertCitation();
				return;
			}
			case 'insertTable': {
				this._editorCore.pluginState.table.insertTable(2, 2);
				return;
			}
			case 'insertColumnBefore': {
				this._editorCore.pluginState.table.insertColumnBefore();
				return;
			}
			case 'insertColumnAfter': {
				this._editorCore.pluginState.table.insertColumnAfter();
				return;
			}
			case 'insertRowBefore': {
				this._editorCore.pluginState.table.insertRowBefore();
				return;
			}
			case 'insertRowAfter': {
				this._editorCore.pluginState.table.insertRowAfter();
				return;
			}
			case 'deleteRow': {
				this._editorCore.pluginState.table.deleteRow();
				return;
			}
			case 'deleteColumn': {
				this._editorCore.pluginState.table.deleteColumn();
				return;
			}
			case 'deleteTable': {
				this._editorCore.pluginState.table.deleteTable();
				return;
			}
			case 'copyImage': {
				let dataURL = this._editorCore.getSelectedImageDataURL();
				if (dataURL) {
					zoteroCopyImage(dataURL);
				}
				return;
			}
			case 'saveImageAs': {
				let dataURL = this._editorCore.getSelectedImageDataURL();
				if (dataURL) {
					zoteroSaveImageAs(dataURL);
				}
				return;
			}
		}
	}

	_getContextMenuItemGroups(node) {
		let groups = [
			[
				{
					name: 'cut',
					label: getLocalizedString('general-cut'),
					enabled: !this._readOnly && this._editorCore.hasSelection(),
					persistent: true
				},
				{
					name: 'copy',
					label: getLocalizedString('general-copy'),
					enabled: this._editorCore.hasSelection(),
					persistent: true
				},
				{
					name: 'paste',
					label: getLocalizedString('general-paste'),
					enabled: !this._readOnly,
					persistent: true
				}
			],
			// [
			// 	{
			// 		name: 'insertCitation',
			// 		label: getLocalizedString('note-editor-insert-citation'),
			// 		enabled: !this._readOnly && !this._editorCore.hasSelection()
			// 	}
			// ],
			[
				{
					name: 'rtl',
					label: getLocalizedString('note-editor-right-to-left'),
					enabled: !this._readOnly && (this._dir === 'ltr' && !this._editorCore.pluginState.menu.rtl.isActive
						|| this._dir === 'rtl' && this._editorCore.pluginState.menu.ltr.isActive)
				},
				{
					name: 'ltr',
					label: getLocalizedString('note-editor-left-to-right'),
					enabled: !this._readOnly && (this._dir === 'ltr' && this._editorCore.pluginState.menu.rtl.isActive
						|| this._dir === 'rtl' && !this._editorCore.pluginState.menu.ltr.isActive)
				},
				{
					name: 'align',
					label: getLocalizedString('note-editor-align'),
					enabled: !this._readOnly,
					groups: [
						[
							{
								name: 'alignLeft',
								label: getLocalizedString('note-editor-align-left'),
								checked: this._editorCore.pluginState.menu.alignLeft.isActive,
								enabled: !this._readOnly
							},
							{
								name: 'alignCenter',
								label: getLocalizedString('note-editor-align-center'),
								checked: this._editorCore.pluginState.menu.alignCenter.isActive,
								enabled: !this._readOnly
							},
							{
								name: 'alignRight',
								label: getLocalizedString('note-editor-align-right'),
								checked: this._editorCore.pluginState.menu.alignRight.isActive,
								enabled: !this._readOnly
							}
						]
					]
				},
			],
			[
				{
					label: getLocalizedString('general-insert'),
					enabled: !this._readOnly,
					groups: [
						[
							{
								name: 'insertCitation',
								label: getLocalizedString('note-editor-citation'),
								enabled: !this._readOnly && !this._isAttachmentNote
							},
							{
								name: 'insertImage',
								label: getLocalizedString('note-editor-image'),
								enabled: !this._readOnly && !this._isAttachmentNote
							},
							{
								name: 'insertTable',
								label: getLocalizedString('note-editor-table'),
								enabled: !this._readOnly && !this._editorCore.pluginState.table.isTableSelected()
							},
							{
								name: 'insertMath',
								label: getLocalizedString('note-editor-math'),
								enabled: !this._readOnly
							}
						]
					]
				}
			],
			[
				{
					name: 'insertRowBefore',
					label: getLocalizedString('note-editor-insert-row-before'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				},
				{
					name: 'insertRowAfter',
					label: getLocalizedString('note-editor-insert-row-after'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				}
			],
			[
				{
					name: 'insertColumnBefore',
					label: getLocalizedString('note-editor-insert-column-before'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				},
				{
					name: 'insertColumnAfter',
					label: getLocalizedString('note-editor-insert-column-after'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				}
			],
			[
				{
					name: 'deleteRow',
					label: getLocalizedString('note-editor-delete-row'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				},
				{
					name: 'deleteColumn',
					label: getLocalizedString('note-editor-delete-column'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				},
				{
					name: 'deleteTable',
					label: getLocalizedString('note-editor-delete-table'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				}
			],
			[
				{
					name: 'copyImage',
					label: getLocalizedString('note-editor-copy-image'),
					enabled: !!this._editorCore.getSelectedImageDataURL()
				},
				{
					name: 'saveImageAs',
					label: getLocalizedString('note-editor-save-image-as'),
					enabled: !!this._editorCore.getSelectedImageDataURL()
				},
			]
		];

		return groups.map(items => items.filter(item => item.enabled || item.persistent)
		).filter(items => items.length);
	}
}

window.addEventListener('message', function (e) {
	let message = e.data.message;
	let instanceID = e.data.instanceID;

	if (message.action === 'crash') {
		if (currentInstance) {
			// TODO: Show error message in NoticeBar
			currentInstance._editorCore.readOnly = true;
		}
	}
	else if (message.action === 'init') {
		// console.log('Initializing a new instance', message);
		if (currentInstance) {
			currentInstance.uninit();
		}

		currentInstance = new EditorInstance({ instanceID, ...message });
	}
});

window.getDataSync = (onlyChanged) => {
	if (currentInstance) {
		return currentInstance.getDataSync(onlyChanged);
	}
	return null;
};

// Called from Zotero, because file picker can only be opened from user-triggered event or privileged code
window.openImageFilePicker = () => {
	if (currentInstance) {
		currentInstance._editorCore.pluginState.image.openFilePicker();
	}
}
