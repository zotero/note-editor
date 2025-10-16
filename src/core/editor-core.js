import { EditorState, TextSelection } from 'prosemirror-state';
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
import { markdownParser } from './plugins/markdown-parser';

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
					markdownParser(),
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
						insertCitation: () => {
							this.pluginState.citation.insertCitation();
							return true;
						},
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
					get metadata() { return that.metadata; }
				}),
				highlight: nodeViews.highlight({
					get metadata() { return that.metadata; }
				}),
				citation: nodeViews.citation({
					get metadata() { return that.metadata; }
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
						if (that.options.mode === 'ios') {
							// Don't use debounce as the iOS app does it by itself
							that.update();
						}
						else {
							that.debouncedUpdate();
						}
					}
				}

				that.updatePluginState(this.state);
				that.onUpdateState && that.onUpdateState();
			},
			handleDOMEvents: {
				// Node (image, citation) selection happens on mouseup, therefore we can't open context menu on mousedown.
				// This limitation probably comes from ProseMirror side
				contextmenu: (view, event) => {
					event.preventDefault();
					setTimeout(() => {
						const { $from } = view.state.selection;
						let node = view.state.doc.nodeAt($from.pos);
						if (!node) {
							node = $from.parent;
						}
						options.onOpenContextMenu($from.pos, node, event.screenX, event.screenY);
					}, 0);
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
		// Check if there are other highlight/underline annotations with colors applied
		let hasAnnotationsWithAppliedColors = false;
		let state = highlightColorKey.getState(this.view.state).state;
		if (!state.canApplyAnnotationColors && state.canRemoveAnnotationColors) {
			hasAnnotationsWithAppliedColors = true;
		}
		state = underlineColorKey.getState(this.view.state).state;
		if (!state.canApplyAnnotationColors && state.canRemoveAnnotationColors) {
			hasAnnotationsWithAppliedColors = true;
		}

		// Check if there are other annotations with citations added
		let hasCitationsRemoved = false;
		state = citationKey.getState(this.view.state).state;
		if (state.canAddCitations && !state.canRemoveCitations) {
			hasCitationsRemoved = true;
		}

		insertHTML(pos, html)(this.view.state, this.view.dispatch);

		// Apply colors if annotations were inserted and doing the same for existing annotations
		state = highlightColorKey.getState(this.view.state).state;
		if (hasAnnotationsWithAppliedColors && state.canApplyAnnotationColors) {
			state.applyAnnotationColors();
		}
		state = underlineColorKey.getState(this.view.state).state;
		if (hasAnnotationsWithAppliedColors && state.canApplyAnnotationColors) {
			state.applyAnnotationColors();
		}

		// Remove citations if annotations were inserted and doing the same for existing annotations
		state = citationKey.getState(this.view.state).state;
		if (hasCitationsRemoved && state.canAddCitations) {
			state.removeCitations();
		}
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

	/**
	 * Apply external changes to the editor incrementally without reinitializing
	 * @param {Object} newData - The new data containing state and html
	 * @param {boolean} preserveSelection - Whether to try to preserve the current selection
	 */
	applyExternalChanges(newData, preserveSelection = true) {
		if (!newData || this.readOnly) {
			return false;
		}

		let { state: newStateData, html: newHtml } = newData;
		
		// Cache selection info before applying changes
		let selectionInfo = null;
		if (preserveSelection) {
			let oldDoc = this.view.state.doc;
			let oldAnchor = this.view.state.selection.anchor;
			let oldHead = this.view.state.selection.head;
			let selStart = Math.min(oldAnchor, oldHead);
			let selEnd = Math.max(oldAnchor, oldHead);
			
			// Find the node path and offset for the selection start position
			let $oldPos = oldDoc.resolve(selStart);
			let path = [];
			for (let d = $oldPos.depth; d > 0; d--) {
				path.unshift($oldPos.index(d - 1));
			}
			
			selectionInfo = {
				anchor: oldAnchor,
				head: oldHead,
				selStart,
				selEnd,
				selLength: selEnd - selStart,
				path,
				offset: $oldPos.parentOffset
			};
		}

		try {
			let newDoc;
			let newMetadata = new Metadata();

			if (newStateData && newStateData.doc && newStateData.metadata) {
				try {
					newDoc = Node.fromJSON(schema, newStateData.doc);
					newMetadata.fromJSON(newStateData.metadata);
				} catch (e) {
					newDoc = null;
				}
			}

			// Fall back to HTML parsing if state data is unavailable or failed
			if (!newDoc && newHtml) {
				try {
					let { html, metadataAttributes } = preprocessHTML(newHtml);
					newMetadata.parseAttributes(metadataAttributes);
					
					newDoc = DOMParser2
						.fromSchema(schema)
						.parse((new DOMParser().parseFromString(html, 'text/html').body));
				} catch (e) {
					throw new Error('HTML parsing failed: ' + (e.message || 'Unknown error'));
				}
			}

			if (!newDoc || !newDoc.content || typeof newDoc.content.size !== 'number') {
				throw new Error('No valid document data available for incremental update');
			}

			let tr = this.view.state.tr;
			
			let currentDocSize = this.view.state.doc.content.size;
			if (typeof currentDocSize !== 'number' || currentDocSize < 0) {
				throw new Error('Invalid current document state');
			}
			
			tr = tr.replaceWith(0, currentDocSize, newDoc.content);
			
			this.metadata = newMetadata;
			schema.cached.metadata = this.metadata;

			// Mark this as a system transaction to avoid triggering save
			tr = tr.setMeta('system', true);
			tr = tr.setMeta('externalUpdate', true);

			let schemaTr = null;
			try {
				// First apply our changes and create a new state
				let newState = this.view.state.apply(tr);
				schemaTr = schemaTransform(newState);
			} catch (e) {
			}
			
			this.view.dispatch(tr);
			
			// Apply schema tr if needed
			if (schemaTr) {
				this.view.dispatch(schemaTr);
			}

			// Force citation nodes to re-render since metadata was updated
			// This ensures annotations with citations display properly
			if (!this.readOnly) {
				touchCitations()(this.view.state, this.view.dispatch);
			}

			if (preserveSelection && selectionInfo) {
				try {
					let newDoc = this.view.state.doc;
					let newDocSize = newDoc.content.size;
					
					let newPos = 0;
					let currentNode = newDoc;
					let validPath = true;
					
					// Navigate the same path in the new document
					for (let i = 0; i < selectionInfo.path.length && validPath; i++) {
						let index = selectionInfo.path[i];
						if (index < currentNode.childCount) {
							for (let j = 0; j < index; j++) {
								newPos += currentNode.child(j).nodeSize;
							}
							newPos += 1;
							currentNode = currentNode.child(index);
						}
						else {
							validPath = false;
							break;
						}
					}
					
					if (validPath) {
						// Restore selection offset
						let maxOffset = currentNode.content ? currentNode.content.size : 0;
						let clampedOffset = Math.min(selectionInfo.offset, maxOffset);
						newPos += clampedOffset;
						
						let newAnchor = Math.max(0, Math.min(newPos, newDocSize));
						let newHead = Math.max(0, Math.min(newPos + selectionInfo.selLength, newDocSize));
						
						// For reverse selections
						if (selectionInfo.anchor > selectionInfo.head) {
							[newAnchor, newHead] = [newHead, newAnchor];
						}
						
						if (newAnchor >= 0 && newHead >= 0 && newAnchor <= newDocSize && newHead <= newDocSize) {
							let selectionTr = this.view.state.tr.setSelection(TextSelection.between(
								this.view.state.doc.resolve(newAnchor),
								this.view.state.doc.resolve(newHead)
							));
							this.view.dispatch(selectionTr);
						}
					}
				}
				catch (e) {
				}
			}

			this.docChanged = false;
			return true;

		} catch (e) {
			// Send message to parent to execute fallback update
			if (typeof window !== 'undefined' && window.parent && window.parent.postMessage) {
				window.parent.postMessage({
					instanceID: this.instanceID,
					message: { action: 'incrementalUpdateFailed' }
				}, '*');
			}
			
			return false;
		}
	}
}

export default EditorCore;
