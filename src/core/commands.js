import { NodeSelection, TextSelection } from 'prosemirror-state';
import { findParentNode } from 'prosemirror-utils';
import { wrapInList, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { Fragment, Slice } from 'prosemirror-model';
import { setBlockType } from 'prosemirror-commands';
import { canSplit } from 'prosemirror-transform';
import { formatCitation, SetAttrsStep } from './utils';
import { fromHTML, schema } from './schema';
import { getMarkAttributes, getMarkRangeAtCursor, getMarkRange, isMarkActive } from './helpers';
import { serializeCitationInnerText } from './schema/utils';

// Alternative commands to work with marks containing attributes,
// as ProseMirror doesn't take into account mark attributes
// Code from https://github.com/ueberdosis/tiptap/tree/main/packages/core/src/commands

export function unsetMark(type) {
	return function(state, dispatch) {
		const { tr } = state;
		const { selection } = tr;
		const { $from, empty, ranges } = selection;

		if (dispatch) {
			if (empty) {
				let { from, to } = selection
				const range = getMarkRange($from, type)

				if (range) {
					from = range.from
					to = range.to
				}

				tr.removeMark(from, to, type)
			}
			else {
				ranges.forEach(range => {
					tr.removeMark(range.$from.pos, range.$to.pos, type)
				})
			}

			tr.removeStoredMark(type)
			dispatch(tr);
		}
		return true;
	}
}

export function setMark(type, attributes = {}) {
	return function(state, dispatch) {
		const { tr } = state;
		const { selection } = tr;
		const { empty, ranges } = selection;

		if (dispatch) {
			if (empty) {
				const oldAttributes = getMarkAttributes(state, type)

				tr.addStoredMark(type.create({
					...oldAttributes,
					...attributes,
				}))
			}
			else {
				ranges.forEach(range => {
					const from = range.$from.pos
					const to = range.$to.pos

					state.doc.nodesBetween(from, to, (node, pos) => {
						const trimmedFrom = Math.max(pos, from)
						const trimmedTo = Math.min(pos + node.nodeSize, to)
						const someHasMark = node.marks.find(mark => mark.type === type)

						// if there is already a mark of this type
						// we know that we have to merge its attributes
						// otherwise we add a fresh new mark
						if (someHasMark) {
							node.marks.forEach(mark => {
								if (type === mark.type) {
									tr.addMark(trimmedFrom, trimmedTo, type.create({
										...mark.attrs,
										...attributes,
									}))
								}
							})
						}
						else {
							tr.addMark(trimmedFrom, trimmedTo, type.create(attributes))
						}
					})
				})
			}
			dispatch(tr);
		}
		return true;
	}
}

export function toggleMark(type, attributes = {}) {
	return function (state) {
		const isActive = isMarkActive(state, type, attributes)

		if (isActive) {
			return unsetMark(type)
		}

		return setMark(type, attributes)
	}
}

export function updateMarkRangeAtCursor(type, attrs) {
		return (state, dispatch) => {
			const { tr, selection, doc } = state;
			let { from, to } = selection;
			const { $from, empty } = selection;

			if (empty) {
				const range = getMarkRangeAtCursor(state, type)
				if (range) {
					from = range.from;
					to = range.to;
				}
			}

			const hasMark = doc.rangeHasMark(from, to, type);

			if (hasMark) {
				tr.removeMark(from, to, type);
			}

			tr.addStoredMark(type.create(attrs));

			if (to > from) {
				tr.addMark(from, to, type.create(attrs));
			}
			dispatch(tr);
		};
	}

	export function removeMarkRangeAtCursor(type) {
		return (state, dispatch) => {
			const { tr, selection } = state;
			let { from, to } = selection;
			const { $from, empty } = selection;

			if (empty) {
				const range = getMarkRangeAtCursor(state, type);
				if (range) {
					from = range.from;
					to = range.to;
				}
			}

			tr.ensureMarks([]);
			if (to > from) {
				tr.removeMark(from, to, type);
			}
			dispatch(tr);
		};
	}

function getClosestListItemNode($pos) {
	let depth = $pos.depth;
	while (depth > 0) {
		let node = $pos.node(depth);
		if (node.type === schema.nodes.listItem) {
			return node;
		}
		depth--;
	}
}

export function changeIndent(dir = 1) {
	return function (state, dispatch, view) {
		let { selection } = state;
		let { $from, $to } = selection;
		let { listItem } = state.schema.nodes;
		let node = getClosestListItemNode($from);
		if (node) {
			if (dir > 0) {
				sinkListItem(listItem)(state, dispatch);
			}
			else if (dir < 0) {
				liftListItem(listItem)(state, dispatch);
			}
			return true;
		}

		let range = $from.blockRange($to);
		let allSupportIndent = true;
		let nodes = [];
		let pos = range.start + 1;
		for (let i = range.startIndex; i < range.endIndex; i++) {
			let node = range.parent.child(i);
			nodes.push([pos, node]);
			pos += node.nodeSize;
			if (!node.type.attrs.indent) {
				allSupportIndent = false;
			}
		}

		let { tr } = state;

		if (allSupportIndent) {
			let changed = false;
			for (let [pos, node] of nodes) {
				let indent = node.attrs.indent || 0;
				if (dir === 1 ? indent < 7 : indent >= 1) {
					indent += dir;
					if (indent === 0) {
						indent = null;
					}
					tr.setBlockType(pos, pos, node.type, { ...node.attrs, indent });
					changed = true;
				}
			}

			if (changed) {
				dispatch(tr);
				return true;
			}
		}
		return false;
	};
}

export function removeBlockIndent() {
	return function (state, dispatch, view) {
		let { selection } = state;
		let { $from, $to } = selection;
		let range = $from.blockRange($to);
		if (range.startIndex + 1 === range.endIndex) {
			let node = range.parent.child(range.startIndex);
			let pos = range.start + 1;
			if (node.type.attrs.indent
				&& node.attrs.indent !== null
				&& pos === $from.pos) {
				let { tr } = state;
				tr.setBlockType(pos, pos, node.type, { ...node.attrs, indent: null });
				dispatch(tr);
				return true;
			}
		}
		return false;
	};
}

export function hasAttr(state, attr, value) {
	let val = false;
	state.doc.nodesBetween(
		state.selection.from,
		state.selection.to,
		(node, pos) => {
			if (node.attrs[attr] === value) {
				val = true;
			}
		});

	return val;
}

export function toggleAlignment(direction) {
	return function (state, dispatch) {
		let tr = state.tr;
		let changes = false;

		state.doc.nodesBetween(
			state.selection.from,
			state.selection.to,
			(node, pos) => {
				// align nodes that support alignment
				if (node.type.attrs.align) {
					changes = true;
					if (node.attrs.align === direction) direction = null;
					tr.setNodeMarkup(pos, null, { ...node.attrs, align: direction });
				}
			});

		if (!changes) return false;
		if (dispatch) dispatch(tr);

		return true;
	};
}

export function toggleDir(dir) {
	return function (state, dispatch) {
		let tr = state.tr;
		let changes = false;

		state.doc.nodesBetween(
			state.selection.from,
			state.selection.to,
			(node, pos) => {
				if (node.type.attrs.dir) {
					changes = true;
					if (node.attrs.dir === dir) dir = null;
					tr.setNodeMarkup(pos, null, { ...node.attrs, dir });
				}
			});

		if (!changes) return false;
		if (dispatch) dispatch(tr);

		return true;
	};
}

export function insertHTML(pos, html) {
	return function (state, dispatch) {
		let slice = fromHTML(html, true);
		let nodes = slice.content.content;
		let docSizeBefore = state.tr.doc.content.size;
		if (pos === null) {
			let { tr } = state;
			let { selection } = tr;
			pos = selection.to;

			let $pos = tr.doc.resolve(pos);
			$pos = tr.doc.resolve($pos.posAtIndex(0, 1));
			let range = $pos.blockRange($pos);
			let slice = new Slice(Fragment.fromArray(nodes), 0, 0);
			if (!selection.$from.nodeBefore) {
				if ($pos.parent.content.size) {
					pos = state.tr.doc.content.size;
					tr.replace(pos, pos, slice);
				}
				else {
					tr.replace(range.start, range.end, slice);
					pos = range.start - 3;
				}
			}
			else {
				if ($pos.parent.content.size) {
					tr.replace(range.end, range.end, slice);
					pos = range.end - 1;
				}
				else {
					tr.replace(range.start + 1, range.end, slice);
					pos = range.start - 3;
				}
			}
			pos += tr.doc.content.size - docSizeBefore;
			tr.setSelection(new TextSelection(tr.doc.resolve(pos))).scrollIntoView();
			dispatch(tr);
		}
		else if (Number.isInteger(pos)) {
			let slice = new Slice(Fragment.fromArray(nodes), 0, 0);
			let negative = false;
			if (pos < 0) {
				negative = true;
				pos = state.tr.doc.content.size;
			}
			let { tr } = state;

			if (tr.doc.childCount === 1 && tr.doc.child(0).content.size === 0) {
				pos = 1;
			}

			let $pos = tr.doc.resolve(pos);
			if ($pos.parent && $pos.parent.type.isBlock && !$pos.parent.content.size) {
				let range = $pos.blockRange($pos);
				tr = tr.replaceWith(range.start, range.end, nodes)
			}
			// Remove next empty block if dragging in-between blocks
			else if ($pos.nodeAfter && $pos.nodeAfter.isBlock && !$pos.nodeAfter.content.size) {
				let range = $pos.blockRange(tr.doc.resolve(pos + 1));
				tr = tr.replaceWith(range.start, range.end, nodes);
			}
			// Remove previous empty block if dragging in-between blocks
			else if ($pos.nodeBefore && $pos.nodeBefore.isBlock && !$pos.nodeBefore.content.size) {
				let range = $pos.blockRange(tr.doc.resolve(pos - 1));
				tr = tr.replaceWith(range.start, range.end, nodes);
			}
			else {
				tr = tr.insert(pos, nodes);
			}

			if (negative) {
				tr = tr.setSelection(new TextSelection(tr.doc.resolve(tr.doc.content.size))).scrollIntoView();
			}
			dispatch(tr);
		}
		else {
			let slice = new Slice(Fragment.fromArray(nodes), 1, 1);
			dispatch(state.tr.replaceSelection(slice));
		}
	};
}

function isList(node, schema) {
	return (node.type === schema.nodes.bulletList
		|| node.type === schema.nodes.orderedList);
}

export function toggleList(listType, itemType) {
	return (state, dispatch, view) => {
		const { schema, selection } = state;
		const { $from, $to } = selection;
		const range = $from.blockRange($to);

		if (!range) {
			return false;
		}

		const parentList = findParentNode(node => isList(node, schema))(selection);

		if (range.depth >= 1 && parentList && range.depth - parentList.depth <= 1) {
			if (parentList.node.type === listType) {
				return liftListItem(itemType)(state, dispatch, view);
			}

			if (isList(parentList.node, schema) && listType.validContent(parentList.node.content)) {
				const { tr } = state;
				tr.setNodeMarkup(parentList.pos, listType);

				if (dispatch) {
					dispatch(tr);
				}

				return false;
			}
		}

		setBlockType(schema.nodes.paragraph)(state, dispatch);
		state = view.state;

		return wrapInList(listType)(state, dispatch);
	};
}

export function setCitation(nodeID, citation) {
	return function (state, dispatch) {
		let formattedCitation = formatCitation(citation);
		state.doc.descendants((node, pos) => {
			if (node.attrs.nodeID === nodeID) {
				if (citation.citationItems.length) {
					let citationNode = state.schema.nodes.citation.create({
						...node.attrs,
						citation
					},
					[
						state.schema.text('(' + formattedCitation + ')')
					]
					);
					dispatch(state.tr.replaceWith(pos, pos + node.nodeSize, citationNode));
				}
				else {
					dispatch(state.tr.delete(pos, pos + node.nodeSize));
				}
				return false;
			}
			return true;
		});
	};
}

// Triggers note serialization and updates citation node views
export function touchCitations() {
	return function (state, dispatch) {
		let { tr } = state;
		state.doc.descendants((node, pos) => {
			if (node.type === schema.nodes.citation) {
				tr.setNodeMarkup(pos, null, { ...node.attrs, version: node.attrs.version++ });
			}
		});
		tr.setMeta('addToHistory', false);
		tr.setMeta('system', true);
		dispatch(tr);
	}
}

export function triggerImagesImport() {
	return function (state, dispatch) {
		let { tr } = state;
		tr.setMeta('autoImportImages', true);
		tr.setMeta('system', true);
		dispatch(tr);
	}
}

export function updateImageDimensions(nodeID, width, height) {
	return function (state, dispatch) {
		let { tr } = state;
		state.doc.descendants((node, pos) => {
			if (node.type === schema.nodes.image && node.attrs.nodeID === nodeID) {
				tr.step(new SetAttrsStep(pos, { ...node.attrs, width, height }));
				tr.setMeta('addToHistory', false);
				tr.setMeta('system', true);
				dispatch(tr);
				return false;
			}
		});
	};
}

export function attachImportedImage(nodeID, attachmentKey) {
	return function (state, dispatch) {
		state.doc.descendants((node, pos) => {
			if (node.attrs.nodeID === nodeID) {
				let src = node.attrs.src;
				if (src && src.startsWith('data:')) {
					src = null;
				}
				dispatch(state.tr.step(new SetAttrsStep(pos, {
					...node.attrs,
					src,
					tempSrc: null,
					attachmentKey
				})).setMeta('addToHistory', false));
				return false;
			}
			return true;
		});
	};
}

export function getSingleSelectedNode(state, type, inside) {
	const { $from, $to } = state.selection;
	let nodes = [];
	state.doc.nodesBetween($from.pos, $to.pos, (parentNode, parentPos) => {
		parentNode.forEach((node, offset, index) => {
			let absolutePos = parentPos + offset + 1;
			if (node.type === type
				&& (
					// For citation, image
					!inside && $from.pos === absolutePos && $to.pos === absolutePos + node.nodeSize
					// For highlight
					|| inside && $from.pos > absolutePos + 1 && $to.pos < absolutePos + node.nodeSize - 1
				)
			) {
				nodes.push({ pos: absolutePos, node, parent: parentNode, index });
			}
		});
	});
	if (nodes.length === 1) {
		return nodes[0];
	}
	return null;
}

// Preserve attrs
export function customSplitBlock(state, dispatch) {
	const { $from, $to } = state.selection
	if (state.selection instanceof NodeSelection && state.selection.node.isBlock) {
		if (!$from.parentOffset || !canSplit(state.doc, $from.pos)) return false
		if (dispatch) dispatch(state.tr.split($from.pos).scrollIntoView())
		return true
	}

	if (!$from.parent.isBlock) return false

	if (dispatch) {
		let atEnd = $to.parentOffset === $to.parent.content.size
		let tr = state.tr
		if (state.selection instanceof TextSelection) tr.deleteSelection()
		let deflt = $from.depth === 0 ? null : $from.node(-1).contentMatchAt($from.indexAfter(-1)).defaultType
		// HERE: All attrs
		let types = atEnd && deflt ? [{ type: deflt, attrs: $from.node().attrs }] : null
		let can = canSplit(tr.doc, $from.pos, 1, types)
		if (!types && !can && canSplit(tr.doc, tr.mapping.map($from.pos), 1, deflt && [{ type: deflt }])) {
			// HERE: All attrs
			types = [{ type: deflt, attrs: $from.node().attrs }]
			can = true
		}
		if (can) {
			tr.split(tr.mapping.map($from.pos), 1, types)
			if (
				!$from.parentOffset &&
				$from.parent.type !== deflt &&
				$from.node(-1).canReplace(
					$from.index(-1),
					$from.indexAfter(-1),
					Fragment.from(deflt.create(), $from.parent))) {
				tr.setNodeMarkup(tr.mapping.map($from.before()), deflt)
			}
		}
		dispatch(tr.scrollIntoView())
	}
	return true
}

export function customTextBetween (slice, from, to, blockSeparator, leafText) {
	var text = "", separated = true;
	slice.nodesBetween(from, to, function (node, pos) {
		if (node.type === schema.nodes.citation) {
			text += serializeCitationInnerText(node);
		}
		else if (node.type === schema.nodes.math_display) {
			text += '$$' + node.textContent + '$$';
		}
		else if (node.type === schema.nodes.math_inline) {
			text += '$' + node.textContent + '$';
		}
		else if (node.isText) {
			text += node.text.slice(Math.max(from, pos) - pos, to - pos);
			separated = !blockSeparator;
		} else if (node.isLeaf && leafText) {
			text += leafText;
			separated = !blockSeparator;
		} else if (!separated && node.isBlock) {
			text += blockSeparator;
			separated = true;
		}
	}, 0);
	return text
}

export function insertMath() {
	return function (state, dispatch) {
		let { selection } = state;
		let { from, $from } = selection;
		if ($from.parent.isBlock && !$from.parent.content.size) {
			let range = $from.blockRange($from);
			let node = schema.nodes.math_display.create(null);
			let tr = state.tr.replaceWith(range.start, range.end, node);
			tr.setSelection(NodeSelection.create(tr.doc, range.start));
			dispatch(tr);
		}
		else {
			let node = schema.nodes.math_inline.create(null);
			let tr = state.tr.insert(from, node);
			tr.setSelection(NodeSelection.create(tr.doc, from));
			dispatch(tr);
		}
	}
}
