import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { DOMParser as DOMParser2, Node } from 'prosemirror-model';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { baseKeymap } from 'prosemirror-commands';
import { tableEditing, fixTables } from "prosemirror-tables";
import { mathPlugin, mathKeymap } from './math';
import { schema, toHTML, buildClipboardSerializer } from './schema';
import Metadata from './schema/metadata';
import { schemaTransform, preprocessHTML } from './schema/transformer';
import nodeViews from './node-views';
import { debounce } from './utils';
import { buildKeymap } from './keymap';
import { buildInputRules } from './input-rules';
import {
	attachImportedImage,
	customTextBetween,
	insertHTML,
	insertMath,
	setCitation,
	touchCitations,
	triggerImagesImport,
	updateImageDimensions
} from './commands';
import Provider from './provider';

import { menu, menuKey } from './plugins/menu';
import { link, linkKey } from './plugins/link';
import { search, searchKey } from './plugins/search';
import { image, imageKey } from './plugins/image';
import { readOnly } from './plugins/read-only';
import { transform } from './plugins/schema-transform';
import { dropPaste } from './plugins/drop-paste';
import { placeholder } from './plugins/placeholder';
import { highlight, highlightKey } from './plugins/highlight';
import { citation, citationKey } from './plugins/citation';
import { nodeID } from './plugins/node-id';
import { drag } from './plugins/drag';
import { pullItemData } from './plugins/pull-item-data';
import { trailingParagraph } from './plugins/trailing-paragraph';
import { table, tableKey } from './plugins/table';
import { markdownSerializer } from './plugins/markdown-serializer';
import { math } from './plugins/math';
import { textColor, textColorKey } from './plugins/text-color';
import { highlightColor, highlightColorKey } from './plugins/highlight-color';
import { underlineColor, underlineColorKey } from './plugins/underline-color';

// TODO: Avoid resetting cursor and losing the recently typed and unsaved
//  text when a newly synced note is set

// TODO: Improve resistance to JSON data in attributes corruption,
//  make sure small issue can't disable the whole editor

// About citation items:
// - Citation itemData can be stored inside citation/highlight/image
//   node or inside metadata container
// - When copying citation/highlight/image `citationItems` are filled
//   with itemData from metadata container to allow transferring it
//   to another editor instance
// - When note is modified `pullItemData` is triggered that pulls
//   all itemData into metadata container
// - If citation/highlight/image is pasted into TinyMCE editor, the
//   item data stays inside citation node, until the note is edited
//   in note-editor
// - On load, metadata `citationItems` are updated and unused items are deleted,
//   although the note is not updated
// - New metadata is applied when note is edited by user

// About images:
// - On load, dimensions are updated automatically which happens when note is opened

// A temporary work-around to disable spell checking for raw TeX
window.addEventListener('focus', (event) => {
	if (event.target && event.target.nodeType === window.Node.ELEMENT_NODE) {
		let container = event.target.closest('.math-src');
		if (container) {
			container.spellcheck = false;
		}
	}
}, true);

class EditorCore {
	constructor(options) {
		this.options = options;
		this.reloaded = options.reloaded;
		this.readOnly = options.readOnly;
		this.disableDrag = options.disableDrag;
		this.isAttachmentNote = options.isAttachmentNote;
		this.unsaved = options.unsaved;
		this.docChanged = false;
		this.unsupportedSchema = false;
		this.nodeViews = [];
		this.metadata = new Metadata();

		// To access metadata over node.type.schema.cached.metadata
		schema.cached.metadata = this.metadata;

		// TODO: Implement lazy and sequential loading for images
		this.provider = new Provider({
			onSubscribe: (subscription) => {
				options.onSubscribe(subscription);
			},
			onUnsubscribe: options.onUnsubscribe
		});

		let doc;
		if (typeof options.value === 'string') {
			let { html, metadataAttributes } = preprocessHTML(options.value);
			this.metadata.parseAttributes(metadataAttributes);
			if (this.metadata.schemaVersion > schema.version) {
				this.unsupportedSchema = true;
				this.readOnly = true;
			}
			doc = DOMParser2
			.fromSchema(schema)
			.parse((new DOMParser().parseFromString(html, 'text/html').body));
		}
		// Document loaded from state always uses the current schema
		else if (typeof options.value === 'object') {
			this.metadata.fromJSON(options.value.metadata);
			doc = Node.fromJSON(schema, options.value.doc);
		}

		if (!doc) {
			return;
		}

		let state = EditorState.create({ doc });
		let tr = schemaTransform(state);
		if (tr) {
			state = state.apply(tr);
		}

		let fix = fixTables(state);
		if (fix) {
			state = state.apply(fix.setMeta("addToHistory", false));
		}

		doc = state.doc;

		let that = this;
		this.view = new EditorView(null, {
			editable: () => !this.readOnly,
			attributes: {
				class: 'primary-editor'
			},
			state: EditorState.create({
				doc,

				plugins: [
					mathPlugin,
					readOnly({ enable: this.readOnly }),
					dropPaste({
						ignoreImages: this.isAttachmentNote,
						onInsertObject: options.onInsertObject
					}),
					transform(),
					nodeID(),
					buildInputRules({
						enableSmartQuotes: this.options.smartQuotes,
					}),
					keymap(mathKeymap),
					keymap(buildKeymap({
						toggleLink: () => {
							this.pluginState.link.toggle();
							return true;
						},
						goToPreviousCell: () => {
							return this.pluginState.table.goToNextCell(-1);
						},
						goToNextCell: () => {
							return this.pluginState.table.goToNextCell(1);
						},
					})),
					keymap(baseKeymap),
					dropCursor(),
					gapCursor(),
					textColor(),
					highlightColor(),
					underlineColor(),
					menu(),
					search(),
					link({
						onOpenURL: options.onOpenURL.bind(this)
					}),
					highlight({
						onOpen: options.onOpenAnnotation,
						metadata: this.metadata
					}),
					image({
						onImportImages: options.onImportImages,
						onOpen: options.onOpenAnnotation,
						metadata: this.metadata
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
							let citation = JSON.parse(JSON.stringify(node.attrs.citation));
							this.metadata.fillCitationItemsWithData(citation.citationItems);
							options.onOpenCitationPopup(node.attrs.nodeID, citation);
						}
					}),
					math(),
					table(),
					// TODO: Trailing paragraph should only be inserted when appending transaction
					// trailingParagraph(),
					// inlineFix(),
					placeholder({
						text: options.placeholder
					}),
					...((this.readOnly || this.disableDrag || options.mode === 'ios') ? [] : [drag()]),
					tableEditing(),
					history(),
					markdownSerializer(),
					// Pulls item data into metadata when doc is being modified,
					// therefore the updated metadata is already available when serializing
					pullItemData({
						onPull: (citationItems) => {
							let updated = this.metadata.addPulledCitationItems(citationItems);
							if (updated) {
								this.updateCitationItemsList();
							}
						}
					}),
				]
			}),

			clipboardSerializer: buildClipboardSerializer(this.provider, schema, this.metadata),

			nodeViews: {
				image: nodeViews.image({
					provider: this.provider,
					onDimensions: (node, width, height) => {
						// Immediately update image dimensions and trigger note updating, which should happen only once per image
						updateImageDimensions(node.attrs.nodeID, width, height)(this.view.state, this.view.dispatch);
					},
					onOpenURL: options.onOpenURL.bind(this),
					metadata: this.metadata
				}),
				highlight: nodeViews.highlight({
					metadata: this.metadata
				}),
				citation: nodeViews.citation({
					metadata: this.metadata
				}),
				table: nodeViews.table()
			},
			dispatchTransaction(tr) {
				if (that.readOnly && tr.docChanged) {
					throw new Error('Trying to update read-only document');
				}

				let newState = this.state.apply(tr);
				this.updateState(newState);

				if (tr.docChanged) {
					that.docChanged = true;
					that.unsaved = false;

					if (tr.getMeta('system')) {
						that.update(true);
					}
					else {
						that.debouncedUpdate();
					}
				}

				that.updatePluginState(this.state);
				that.onUpdateState && that.onUpdateState();
			},
			handleDOMEvents: {
				// Node (image, citation) selection happens on mouseup, therefore we can't open context menu on mousedown.
				// This limitation probably comes from ProseMirror side
				mouseup: (view, event) => {
					if (event.button === 2) {
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

		this.view.editorCore = this;

		// Update/cleanup metadata without triggering note update
		if (!this.readOnly) {
			// Undo stack is empty therefore unused citation items can be
			// deleted, although this by it self doesn't trigger doc saving
			this.metadata.deleteUnusedCitationItems(this.view.state);

			// Call this after `initialized` event is sent
			setTimeout(() => {
				// Do automatic note modifications only when note was opened by user
				// and not by reload (sync, notify), otherwise it can result to sync
				// carousel, if i.e. different clients have different citation item
				// data and the same note is opened on both clients
				this.updateCitationItemsList();
				if (!this.reloaded) {
					triggerImagesImport()(this.view.state, this.view.dispatch);
				}
			}, 0);

			// TODO: Consider to add `citationItem` to image and highlight annotations if
			//  it's missing (because there was no parent item at the time)
		}

		// DevTools can freeze editor and throw random errors!
		// applyDevTools(this.view);

		this.updatePluginState(this.view.state);
	}

	update = (system) => {
		if (this.readOnly) {
			return;
		}
		this.options.onUpdate(system);
		this.docChanged = false;
	};

	// TODO: Have a debounce maximum wait time, to prevent not saving
	//  it too long and therefore losing more text
	debouncedUpdate = debounce(() => {
		this.update();
	}, 1000);

	// In response to this method `updateCitationItems` updates metadata
	// and formatted citations
	updateCitationItemsList() {
		let list = this.metadata.citationItems.map(ci => ({ uris: ci.uris }));

		// Add missing metadata citationItems that were produced by copying
		// citations/highlights/images not over note-editor
		let missing = this.metadata.getMissingCitationItems(this.view.state);
		list = [...list, ...missing];

		this.options.onUpdateCitationItemsList(list);
	}

	// For reloaded note the updated item data is not saved automatically and
	// citation views aren't updated. Although dragging/copying serialization
	// uses the updated citation data
	updateCitationItems(citationItems) {
		let updatedCitationItems = this.metadata.updateCitationItems(citationItems);
		if (updatedCitationItems.length && !this.reloaded) {
			touchCitations()(this.view.state, this.view.dispatch);
		}
	}

	updatePluginState(state) {
		this.pluginState = {
			core: { unsaved: this.unsaved },
			textColor: textColorKey.getState(state),
			highlightColor: highlightColorKey.getState(state),
			underlineColor: underlineColorKey.getState(state),
			menu: menuKey.getState(state),
			link: linkKey.getState(state),
			search: searchKey.getState(state),
			highlight: highlightKey.getState(state),
			image: imageKey.getState(state),
			citation: citationKey.getState(state),
			table: tableKey.getState(state)
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

	insertMath() {
		insertMath()(this.view.state, this.view.dispatch);
	}

	hasSelection() {
		let selection = this.view.state.doc.cut(
			this.view.state.selection.from,
			this.view.state.selection.to
		);
		return selection.content.size > 0;
	}

	getSelectedImageDataURL() {
		let { state } = this.view;
		let { node } = state.selection;
		if (node && node.type === schema.nodes.image) {
			let data = this.provider.getCachedData(node.attrs.nodeID, 'image');
			if (data && data.src.includes('base64')) {
				return data.src;
			}
		}
		return null;
	}

	getHTML() {
		return toHTML(this.view.state.doc.content, this.metadata);
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
				metadata: this.metadata.toJSON(),
				doc: this.view.state.doc.toJSON()
			},
			html: this.getHTML()
		};
	}
}

export default EditorCore;
