import { TextSelection } from 'prosemirror-state'
import { findParentNode } from 'prosemirror-utils';
import { wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list'
import { encodeObject } from './utils';
import { fromHtml } from './schema';


export function changeIndent(dir = 1) {
  return function (state, dispatch, view) {
    const INDENT_WIDTH = 40; // px

    const { selection } = state;
    const { $from, $to } = selection;
    const { paragraph, heading, bullet_list, ordered_list, list_item } = state.schema.nodes;
    const node = $to.node(1);

    if (node) {
      let indent = parseInt(node.attrs.indent) || 0;
      indent = indent / INDENT_WIDTH;

      let inLimit = dir === 1 ? indent < 6 : indent >= 1;
      if (node.type === paragraph || node.type === heading) {
        if (inLimit) {
          const attrs = {};
          if (node.type === heading) {
            attrs.level = node.attrs['level'];
          }

          let px = INDENT_WIDTH * (indent + dir);

          if (px > 0) {
            attrs.indent = px + 'px';
          }

          dispatch(state.tr.setBlockType($to.pos, $to.pos, node.type, attrs));
        }
        return true;
      }

      if (node.type === bullet_list || node.type === ordered_list) {
        if (dir > 0) {
          sinkListItem(list_item)(state, dispatch);
        }
        else if (dir < 0) {
          liftListItem(list_item)(state, dispatch);
        }
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
          tr.setNodeMarkup(pos, null, { align: direction })
        }
      });

    if (!changes) return false;
    if (dispatch) dispatch(tr);

    return true
  }
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
          tr.setNodeMarkup(pos, null, { dir })
        }
      });

    if (!changes) return false;
    if (dispatch) dispatch(tr);

    return true
  }
}

export function toggleMark1(markType, attrs, force) {
  return function (state, dispatch) {
    var ref = state.selection;
    var empty = ref.empty;
    var $cursor = ref.$cursor;
    var ranges = ref.ranges;
    if ((empty && !$cursor)) {
      return false
    }
    if (dispatch) {
      if ($cursor) {
        if (!force && markType.isInSet(state.storedMarks || $cursor.marks())) {
          dispatch(state.tr.removeStoredMark(markType));
        }
        else {
          dispatch(state.tr.addStoredMark(markType.create(attrs)));
        }
      }
      else {
        var has = false, tr = state.tr;
        for (var i = 0; !has && i < ranges.length; i++) {
          var ref$1 = ranges[i];
          var $from = ref$1.$from;
          var $to = ref$1.$to;
          has = state.doc.rangeHasMark($from.pos, $to.pos, markType);
        }

        for (var i$1 = 0; i$1 < ranges.length; i$1++) {
          var ref$2 = ranges[i$1];
          var $from$1 = ref$2.$from;
          var $to$1 = ref$2.$to;
          if (!force && has) {
            tr.removeMark($from$1.pos, $to$1.pos, markType);
          }
          else {
            tr.addMark($from$1.pos, $to$1.pos, markType.create(attrs));
          }
        }
        dispatch(tr.scrollIntoView());
      }
    }
    return true
  }
}


export function insertCitations(citations, pos) {
  return function (state, dispatch) {
    let html = '';
    for (let citation of citations) {
      html += `<span class="citation" data-citation="${encodeObject(citation)}"></span>`;
    }
    dispatch(state.tr.insert(pos, fromHtml(html)));
  }
}

export function insertAnnotationsAndCitations(list, pos) {
  return function (state, dispatch) {
    for (let { annotation, citation } of list) {

      let savedAnnotation = {
        uri: annotation.uri,
        position: annotation.position
      }

      let html = '';

      if (annotation.image) {
        html += `<img class="area" data-annotation="${encodeObject(savedAnnotation)}" src="${annotation.image}"/>`;
      }

      if (annotation.comment) {
        html += `${annotation.comment}`;
      }

      if (annotation.text) {
        html += html.length ? ' ' : '';
        html += `<span class="highlight" data-annotation="${encodeObject(savedAnnotation)}">"${annotation.text}"</span>`;
      }

      html += html.length ? ' ' : '';
      html += `<span class="citation" data-citation="${encodeObject(citation)}"></span>`;

      if (pos) {
        dispatch(state.tr.insert(pos, fromHtml(html)));
      }
      else {
        dispatch(state.tr.replaceSelectionWith(fromHtml(html)));
      }
    }
  }

}

function isList(node, schema) {
  return (node.type === schema.nodes.bullet_list
    || node.type === schema.nodes.ordered_list)
}

export function toggleList(listType, itemType) {
  return (state, dispatch, view) => {
    const { schema, selection } = state
    const { $from, $to } = selection
    const range = $from.blockRange($to)

    if (!range) {
      return false
    }

    const parentList = findParentNode(node => isList(node, schema))(selection)

    if (range.depth >= 1 && parentList && range.depth - parentList.depth <= 1) {
      if (parentList.node.type === listType) {
        return liftListItem(itemType)(state, dispatch, view)
      }

      if (isList(parentList.node, schema) && listType.validContent(parentList.node.content)) {
        const { tr } = state
        tr.setNodeMarkup(parentList.pos, listType)

        if (dispatch) {
          dispatch(tr)
        }

        return false
      }
    }

    return wrapInList(listType)(state, dispatch, view)
  }
}

