import React from 'react';
import ReactDOM from 'react-dom';
import { IntlProvider } from 'react-intl';

import { randomString } from './core/utils';
import { schema } from './core/schema';
import Editor from './ui/editor';
import EditorCore from './core/editor-core';
import { insertTable } from './core/commands';

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
		this._isAttachmentNote = options.isAttachmentNote;
		this._localizedStrings = options.localizedStrings;
		this._smartQuotes = options.smartQuotes;
		this._editorCore = null;

		// TODO: Don't use global var
		window.localizedStrings = options.localizedStrings;

		this._setFont(options.font);
		if (options.style) {
			this._setStyle(options.style);
		}
		this._init(options.value);
	}

	getDataSync(onlyChanged) {
		return this._editorCore.getData(onlyChanged);
	}

	_getLocalizedString(key) {
		let string = this._localizedStrings[key];
		return string || key;
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

		ReactDOM.render(
			<IntlProvider
				locale={window.navigator.language}
				messages={this._localizedStrings}
			>
				<Editor
					readOnly={this._readOnly}
					disableUI={this._disableUI}
					// TODO: Rename this to something like 'inContextPane`
					enableReturnButton={this._enableReturnButton}
					viewMode={this._viewMode}
					showUpdateNotice={this._editorCore.unsupportedSchema}
					editorCore={this._editorCore}
					onClickReturn={() => {
						this._postMessage({ action: 'return' });
					}}
					onShowNote={() => {
						this._postMessage({ action: 'showNote' });
					}}
					onOpenWindow={() => {
						this._postMessage({ action: 'openWindow' });
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
			case 'setFont': {
				let { font } = message;
				this._setFont(font);
			}
			case 'setStyle': {
				let { style } = message;
				this._setStyle(style);
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
			// case 'insertCitation': {
			// 	let citation = {
			// 		citationItems: [],
			// 		properties: {}
			// 	};
			//
			// 	let nodeID = randomString();
			// 	let citationNode = schema.nodes.citation.create({ nodeID, citation });
			// 	let { state, dispatch } = this._editorCore.view;
			// 	// TODO: Automatically add white spaces before/after citation when necessary
			// 	dispatch(state.tr.insert(pos, citationNode));
			// 	this._postMessage({ action: 'openCitationPopup', nodeID, citation });
			// 	return;
			// }
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
		}
	}

	_getContextMenuItemGroups(node) {
		let groups = [
			[
				{
					name: 'cut',
					label: this._getLocalizedString('noteEditor.cut'),
					enabled: !this._readOnly && this._editorCore.hasSelection(),
					persistent: true
				},
				{
					name: 'copy',
					label: this._getLocalizedString('noteEditor.copy'),
					enabled: this._editorCore.hasSelection(),
					persistent: true
				},
				{
					name: 'paste',
					label: this._getLocalizedString('noteEditor.paste'),
					enabled: !this._readOnly,
					persistent: true
				}
			],
			// [
			// 	{
			// 		name: 'insertCitation',
			// 		label: this._getLocalizedString('noteEditor.insertCitation'),
			// 		enabled: !this._readOnly && !this._editorCore.hasSelection()
			// 	}
			// ],
			[
				{
					name: 'rtl',
					label: this._getLocalizedString('noteEditor.rightToLeft'),
					enabled: !this._readOnly && (this._dir === 'ltr' && !this._editorCore.pluginState.menu.rtl.isActive
						|| this._dir === 'rtl' && this._editorCore.pluginState.menu.ltr.isActive)
				},
				{
					name: 'ltr',
					label: this._getLocalizedString('noteEditor.leftToRight'),
					enabled: !this._readOnly && (this._dir === 'ltr' && this._editorCore.pluginState.menu.rtl.isActive
						|| this._dir === 'rtl' && !this._editorCore.pluginState.menu.ltr.isActive)
				},
				{
					name: 'align',
					label: this._getLocalizedString('noteEditor.align'),
					enabled: !this._readOnly,
					groups: [
						[
							{
								name: 'alignLeft',
								label: this._getLocalizedString('noteEditor.alignLeft'),
								checked: this._editorCore.pluginState.menu.alignLeft.isActive,
								enabled: !this._readOnly
							},
							{
								name: 'alignCenter',
								label: this._getLocalizedString('noteEditor.alignCenter'),
								checked: this._editorCore.pluginState.menu.alignCenter.isActive,
								enabled: !this._readOnly
							},
							{
								name: 'alignRight',
								label: this._getLocalizedString('noteEditor.alignRight'),
								checked: this._editorCore.pluginState.menu.alignRight.isActive,
								enabled: !this._readOnly
							}
						]
					]
				},
			],
			[
				{
					name: 'insertTable',
					label: this._getLocalizedString('noteEditor.insertTable'),
					enabled: !this._readOnly && !this._editorCore.pluginState.table.isTableSelected()
				}
			],
			[
				{
					name: 'insertRowBefore',
					label: this._getLocalizedString('noteEditor.insertRowBefore'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				},
				{
					name: 'insertRowAfter',
					label: this._getLocalizedString('noteEditor.insertRowAfter'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				}
			],
			[
				{
					name: 'insertColumnBefore',
					label: this._getLocalizedString('noteEditor.insertColumnBefore'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				},
				{
					name: 'insertColumnAfter',
					label: this._getLocalizedString('noteEditor.insertColumnAfter'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				}
			],
			[
				{
					name: 'deleteRow',
					label: this._getLocalizedString('noteEditor.deleteRow'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				},
				{
					name: 'deleteColumn',
					label: this._getLocalizedString('noteEditor.deleteColumn'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				},
				{
					name: 'deleteTable',
					label: this._getLocalizedString('noteEditor.deleteTable'),
					enabled: !this._readOnly && this._editorCore.pluginState.table.isTableSelected()
				}
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
