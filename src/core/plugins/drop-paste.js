import { Plugin } from 'prosemirror-state';
import { Fragment, Slice } from 'prosemirror-model';
import { schema } from '../schema';

// This plugin intercepts all paste/drop/move actions

// Image import behavior on paste/drop/move:
// - Data URL:
//   - On paste/drop JPEG/PNG is imported, others rejected
//   - On move JPEG/PNG is imported, others moved untouched
// - URL:
//   - On paste/drop the URL is downloaded in the client
//     and imported if it is JPEG/PNG
//   - On move is moved untouched
//
// TODO: Add other image types as well
// But before that evaluate what measures are needed
// to avoid importing meaningless images i.e. dozens of svg icons
// when pasting a website, although dropping a svg file from
// a file system seems a valid reason

const IMPORT_IMAGE_TYPES = [
	'image/jpeg',
	'image/png'
];

const IMAGE_DATA_URL_MAX_LENGTH = 16 * 1024 * 1024;

function isImageValid(node) {
	let { src, attachmentKey } = node.attrs;
	// Invalid when:
	return !(
		// Missing src and attachmentKey
		!src && !attachmentKey
		// Is a data URL but has an unsupported MIME type
		|| src.startsWith('data:') && !IMPORT_IMAGE_TYPES.includes(src.slice(5).split(/[,;]/)[0])
		// Data URL is too long
		|| src.length > IMAGE_DATA_URL_MAX_LENGTH
	);
}

function transformFragment(schema, fragment, data, ignoreImages) {
	if (!data) {
		data = {
			imageNum: 0
		};
	}
	const nodes = [];
	for (let i = 0; i < fragment.childCount; i++) {
		let child = fragment.child(i);
		if (child.type === schema.nodes.image) {
			if (!ignoreImages && isImageValid(child)) {
				data.imageNum++;
				if (child.attrs.src.startsWith('data:')) {
					child = schema.nodes.image.create({
						...child.attrs,
						src: child.attrs.originalSrc,
						originalSrc: null,
						tempSrc: child.attrs.src
					});
				}
			}
			else {
				continue;
			}
		}
		nodes.push(child.copy(transformFragment(schema, child.content)));
	}
	return Fragment.fromArray(nodes);
}

function transformSlice(schema, slice, ignoreImages) {
	const fragment = transformFragment(schema, slice.content, null, ignoreImages);
	if (fragment) {
		return new Slice(fragment, slice.openStart, slice.openEnd);
	}
}

async function insertImages(view, pos, files) {
	let { state, dispatch } = view;
	let nodes = [];
	let promises = [];
	for (let file of files) {
		if (IMPORT_IMAGE_TYPES.includes(file.type)) {
			promises.push(new Promise((resolve) => {
				let reader = new FileReader();
				reader.onload = function () {
					let dataURL = this.result;
					nodes.push(schema.nodes.image.create({
						tempSrc: dataURL
					}));
					resolve();
				};
				reader.onerror = () => {
					resolve();
				};
				reader.readAsDataURL(file);
			}));
		}
	}
	await Promise.all(promises);
	if (nodes.length) {
		if (pos !== null) {
			dispatch(state.tr.insert(pos, nodes));
		}
		else {
			let slice = new Slice(new Fragment(nodes), 0, 0);
			dispatch(state.tr.replaceSelection(slice, false));
		}
	}
}

function isLink(str) {
	return !str.includes(' ') && /^(https?:\/\/|ssh:\/\/|zotero:\/\/|ftp:\/\/|file:\/|www\.|(?:mailto:)?[A-Z0-9._%+\-]+@(?!.*@))(.+)$/i.test(str);
}

function isImageURL(str) {
	return /^http[^\?]*.(jpeg|jpg|jpe|jfi|jif|jfif|png|gif|bmp|webp)(\?(.*))?$/gmi.test(str);
}

// TODO: Fix drop/paste into inline code
// TODO: Limit pasted images width to the default value
// NOTICE: Sometimes copying HTML from Chrome to the editor (no matter if
// it's running in Zotero or original FF) hangs for less than a second, and
// returns an empty value for `getData('text/html')`. Seems like a browser bug
export function dropPaste(options) {
	return new Plugin({
		props: {
			handlePaste(view, event, slice) {
				let { state, dispatch } = view;
				let data;
				if (data = event.clipboardData.getData('zotero/annotation')) {
					options.onInsertObject('zotero/annotation', data);
					return true;
				}
				// This was tested and works on macOS and Firefox 72
				else if (event.clipboardData.files.length) {
					if (!options.ignoreImages) {
						insertImages(view, null, event.clipboardData.files);
					}
					return true;
				}
				let text = event.clipboardData.getData('text/plain');
				let html = event.clipboardData.getData('text/html');
				if (!event.shiftKey && html) {
					slice = transformSlice(schema, slice, options.ignoreImages);
					dispatch(state.tr.replaceSelection(slice));
					return true;
				}
				if (text) {
					if (isImageURL(text)) {
						let node = schema.nodes.image.create({ src: text });
						dispatch(state.tr.replaceSelectionWith(node, false));
						return true;
					}
					else if (isLink(text)) {
						let link = schema.marks.link.create({ href: text });
						let node = schema.text(text).mark([link]);
						dispatch(state.tr.replaceSelectionWith(node, false));
						return true;
					}
				}
				// Allow image pasting on Windows. It's inserted into contenteditable, while
				// event.clipboardData.files remains empty and there is no .getData('text/html') as well.
				// Update: Allow on all platforms and hope that it would help for Linux users
				// TODO: Allow on all platforms, because it's likely that the next Zotero Firefox version should allow this on macOS
				if (!text && !html) {
					window.shortlyAllowImageImport = true;
				}
				return false;
			},
			handleDrop(view, event, slice, moved) {
				let { state, dispatch } = view;
				let text = event.dataTransfer.getData('text/plain') || window.droppedData && window.droppedData['text/plain'];
				let html = event.dataTransfer.getData('text/html') || window.droppedData && window.droppedData['text/html'];
				let pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
				let data;
				if (event.dataTransfer.files.length) {
					if (!options.ignoreImages) {
						insertImages(view, pos.pos, event.dataTransfer.files);
					}
					return true;
				}
				else if (data = event.dataTransfer.getData('zotero/annotation')) {
					options.onInsertObject('zotero/annotation', data, pos.pos);
					return true;
				}
				else if (data = event.dataTransfer.getData('zotero/item')) {
					options.onInsertObject('zotero/item', data, pos.pos);
					return true;
				}

				if (moved) {
					let { tr } = state;
					// This was adapted from deleteTable that is in prosemirror-tables
					var $pos = state.selection.$anchor;
					for (var d = $pos.depth; d > 0; d--) {
						var node = $pos.node(d);
						if (node.type.spec.tableRole == 'table') {
							tr.delete($pos.before(d), $pos.after(d)).scrollIntoView();

							let pos2 = tr.mapping.map(pos.pos);
							tr.replaceRange(pos2, pos2, slice);

							dispatch(tr);
							return true;
						}
					}
				}

				if (!moved && html) {
					slice = transformSlice(schema, slice, options.ignoreImages);
					dispatch(state.tr.replaceRange(pos.pos, pos.pos, slice));
					return true;
				}
				if (text) {
					if (isImageURL(text)) {
						let node = schema.nodes.image.create({ src: text });
						dispatch(state.tr.replaceRangeWith(pos.pos, pos.pos, node));
						return true;
					}
					else if (isLink(text)) {
						let link = schema.marks.link.create({ href: text });
						let node = schema.text(text).mark([link]);
						dispatch(state.tr.replaceRangeWith(pos.pos, pos.pos, node));
						return true;
					}
				}
				return false;
			}
		}
	});
}
