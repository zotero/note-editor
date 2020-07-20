export const getActiveColor = function (state) {
  const { $from, $to, $cursor } = state.selection;
  const { textColor } = state.schema.marks;

  // Filter out other marks
  let marks = [];
  if ($cursor) {
    marks.push(
      textColor.isInSet(state.storedMarks || $cursor.marks()) || undefined
    );

  }
  else {
    state.doc.nodesBetween($from.pos, $to.pos, currentNode => {
      if (currentNode.isLeaf) {
        const mark = textColor.isInSet(currentNode.marks) || undefined;
        marks.push(mark);
        return !mark;
      }
      return true;
    });
  }

  const marksWithColor = marks.filter(mark => !!mark);
  // When multiple colors are selected revert back to default color
  if (
    marksWithColor.length > 1 ||
    (marksWithColor.length === 1 && marks.length > 1)
  ) {
    return null;
  }
  return marksWithColor.length
    ? marksWithColor[0].attrs.textColor
    : 'default';
};

export const randomString = function (len, chars) {
  if (!chars) {
    chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  }
  if (!len) {
    len = 8;
  }
  var randomstring = '';
  for (var i = 0; i < len; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
};

export function generateObjectKey() {
  let len = 8;
  let allowedKeyChars = '23456789ABCDEFGHIJKLMNPQRSTUVWXYZ';

  var randomstring = '';
  for (var i = 0; i < len; i++) {
    var rnum = Math.floor(Math.random() * allowedKeyChars.length);
    randomstring += allowedKeyChars.substring(rnum, rnum + 1);
  }
  return randomstring;
}

export function encodeObject(value) {
  return encodeURIComponent(JSON.stringify(value));
}

export function decodeObject(value) {
  try {
    return JSON.parse(decodeURIComponent(value));
  }
  catch (e) {

  }

  return null;
}

export function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this, args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

import {
  findParentNode,
  findSelectedNodeOfType
} from 'prosemirror-utils'

export default function nodeIsActive(state, type, attrs = {}) {
  const predicate = node => node.type === type
  const node = findSelectedNodeOfType(type)(state.selection)
    || findParentNode(predicate)(state.selection)

  if (!Object.keys(attrs).length || !node) {
    return !!node
  }

  return node.node.hasMarkup(type, { ...node.node.attrs, ...attrs })
}


