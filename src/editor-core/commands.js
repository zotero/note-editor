import { TextSelection } from 'prosemirror-state'
import { wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list'


export function changeIndent(dir = 1) {
  return function (state, dispatch, view) {
    const INDENT_WIDTH = 40; // px

    const { selection } = state;
    const { $from, $to } = selection;
    const { paragraph, heading, bullet_list, ordered_list, list_item } = state.schema.nodes;
    const node = $to.node(1);

    if (node) {
      let indent = parseInt(node.attrs.indent) || 0;
      // console.log({ indent })
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
