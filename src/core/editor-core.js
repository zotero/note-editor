import applyDevTools from 'prosemirror-dev-tools';
import { EditorState, NodeSelection, Plugin, SelectionRange } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { schema, toHTML, buildClipboardSerializer } from './schema';
import { DOMSerializer } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { DOMParser as DOMParser2, Pos, Node } from 'prosemirror-model';
import { debounce, decodeObject, encodeObject, randomString } from './utils';


import nodeViews from './node-views';
import { attachImportedImage, insertHTML, setCitation } from './commands';
import { columnResizing, tableEditing } from 'prosemirror-tables';

import { dropCursor } from 'prosemirror-dropcursor';
import { menu, menuKey } from './plugins/menu';
import { link, linkKey } from './plugins/link';
import { search, searchKey } from './plugins/search';
import { image, imageKey } from './plugins/image';

import { gapCursor } from 'prosemirror-gapcursor';
import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { buildKeymap } from './keymap';
import { baseKeymap } from 'prosemirror-commands';
import { buildInputRules } from './input-rules';
import { trailingParagraph } from './plugins/trailing-paragraph';
import { nodeID } from './plugins/node-id';
import Provider from './provider';
import { schemaTransform, digestHTML } from './schema/transformer';
import { readOnly } from './plugins/read-only';
import { transform } from './plugins/schema-transform';
import { dropPaste } from './plugins/drop-paste';
import { placeholder } from './plugins/placeholder';
import { highlight, highlightKey } from './plugins/highlight';
import { citation, citationKey } from './plugins/citation';
import { drag } from './plugins/drag';

// TODO: Avoid resetting cursor and losing the recently typed and unsaved
//  text when a newly synced note is set

class EditorCore {
	constructor(options) {
		this.readOnly = options.readOnly;
		this.unsaved = options.unsaved;
		this.docChanged = false;
		this.dimensionsStore = { data: {} };
		this.unsupportedSchema = false;
		this.nodeViews = [];

		this.provider = new Provider({
			onSubscribe: options.onSubscribeProvider,
			onUnsubscribe: options.onUnsubscribeProvider
		});

		let clipboardSerializer = buildClipboardSerializer(this.provider, schema);

		let prevHTML = null;
		// TODO: Have a debounce maximum wait time, to prevent not saving
		//  it too long and therefore losing more text
		let updateNote = debounce(() => {
			if (this.readOnly) {
				return;
			}
			let html = this.getHTML() || null;
			if (html !== prevHTML) {
				prevHTML = html;
				options.onUpdate(html);
				this.docChanged = false;
			}
		}, 1000);

		let doc;


		if (typeof options.value === 'string') {
			let { html, metadata } = digestHTML(options.value);
			options.value = html;
			if (metadata.schemaVersion > schema.version) {
				this.unsupportedSchema = true;
				this.readOnly = true;
			}
			// console.log({ metadata })
			doc = DOMParser2.fromSchema(schema).parse((new DOMParser().parseFromString(options.value, 'text/html').body));
		}
		else if (typeof options.value === 'object') {
			doc = Node.fromJSON(schema, options.value.doc);
		}
		if (!doc) return;


		let state = EditorState.create({ doc });
		let tr = schemaTransform(state);
		if (tr) {
			state = state.apply(tr);
			doc = state.doc;
		}

		let that = this;
		this.view = new EditorView(null, {
			editable: () => !this.readOnly,
			attributes: {
				// 'spellcheck': false,
				class: 'primary-editor'
			},
			state: EditorState.create({
				doc,
				plugins: [
					readOnly({ enable: this.readOnly }),
					dropPaste({
						onInsertObject: options.onInsertObject
					}),
					transform(),
					nodeID(),
					buildInputRules(schema),
					keymap(buildKeymap(schema)),
					keymap(baseKeymap),
					dropCursor(),
					gapCursor(),
					menu(),
					search(),
					link({
						onOpenURL: options.onOpenURL.bind(this)
					}),
					highlight({
						onOpen: options.onOpenAnnotation,
						onGenerateCitation: options.onGenerateCitation
					}),
					image({
						dimensionsStore: this.dimensionsStore,
						onSyncAttachmentKeys: options.onSyncAttachmentKeys,
						onImportImages: options.onImportImages,
						onOpen: options.onOpenAnnotation,
						onGenerateCitation: options.onGenerateCitation
					}),
					citation({
						onShowItem: (node) => {
							options.onShowCitationItem(node.attrs.citation);
						},
						onOpen: (node) => {
							options.onOpenCitationPage(node.attrs.citation);
						},
						onEdit: (node) => {
							if (!node.attrs.nodeID) return;
							options.onOpenCitationPopup(node.attrs.nodeID, node.attrs.citation);
						}
					}),
					// TODO: Trailing paragraph should only be inserted when appending transaction
					// trailingParagraph(),
					// inlineFix(),
					placeholder({
						text: options.placeholder
					}),
					...(this.readOnly ? [] : [drag()]),
					// columnResizing(),
					tableEditing(),
					history()
				]
			}),
			clipboardSerializer,
			nodeViews: {
				image: nodeViews.image({
					provider: this.provider,
					onDimensions: (node, width, height) => {
						// TODO: Dimension can also be updated if user modified the document just seconds a go
						this.dimensionsStore.data[node.attrs.nodeID] = [width, height];
					},
					onOpenURL: options.onOpenURL.bind(this)
				}),
				citation: nodeViews.citation({
					provider: this.provider
				})
			},
			dispatchTransaction(transaction) {
				if (that.readOnly && transaction.docChanged) {
					throw new Error('Document change should never happen in read-only mode');
				}
				let newState = this.state.apply(transaction);
				if (transaction.docChanged
					&& toHTML(this.state.doc.content) !== toHTML(newState.doc.content)) {
					that.docChanged = true;
					that.unsaved = false;
					updateNote();
				}
				this.updateState(newState);

				that.updatePluginState(this.state);
				that.onUpdateState && that.onUpdateState();
			},
			handleDOMEvents: {
				mousedown: (view, event) => {
					if (event.button === 2) {
						// let pos = view.posAtDOM(event.target);
						//
						//
						// // let pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
						// if (pos) {
						//   let $pos = view.state.doc.resolve(pos);
						//   let node = view.state.doc.nodeAt(pos);
						//   if (!node) {
						//     node = $pos.parent;
						//   }
						//   if (node.isText) {
						//     node = $pos.node()
						//   }

						setTimeout(() => {
							const { $from } = view.state.selection;
							let node = view.state.doc.nodeAt($from.pos);
							if (!node) {
								node = $from.parent;
							}
							options.onOpenContextMenu($from.pos, node, event.screenX, event.screenY);
						}, 0);
					}
				},
				click: (view, event) => {
					if (event.target.closest('a')) {
						event.preventDefault();
					}
				}
			}
		});

		// DevTools might freeze the editor and throw random errors
		// applyDevTools(this.view);
		this.view.editorCore = this;
		this.updatePluginState(this.view.state);
	}

	updatePluginState(state) {
		this.pluginState = {
			core: {unsaved: this.unsaved},
			menu: menuKey.getState(state),
			link: linkKey.getState(state),
			search: searchKey.getState(state),
			highlight: highlightKey.getState(state),
			image: imageKey.getState(state),
			citation: citationKey.getState(state)
		};
	}

	getNodeView(pos) {
		return this.nodeViews.find((nodeView) => {
			let nodeViewPos = nodeView.getPos();
			return pos >= nodeViewPos && pos < nodeViewPos + nodeView.node.content.size + 1;
		});
	}

	setCitation(nodeID, citation, formattedCitation) {
		setCitation(nodeID, citation, formattedCitation)(this.view.state, this.view.dispatch);
	}

	attachImportedImage(nodeID, attachmentKey) {
		attachImportedImage(nodeID, attachmentKey)(this.view.state, this.view.dispatch);
	}

	insertHTML(pos, html) {
		insertHTML(pos, html)(this.view.state, this.view.dispatch);
	}

	hasSelection() {
		let selection = this.view.state.doc.cut(
			this.view.state.selection.from,
			this.view.state.selection.to
		);
		return selection.content.size > 0;
	}

	getHTML() {
		return toHTML(this.view.state.doc.content);
	}

	focus() {
		this.view.focus();
	}

	getData(onlyChanged) {
		if (onlyChanged && !this.docChanged) {
			return null;
		}

		return {
			state: {
				doc: this.view.state.doc.toJSON()
			},
			html: this.getHTML() || null
		};
	}
}

export default EditorCore;
