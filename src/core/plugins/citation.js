import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { schema } from '../schema';
import { toggleMark } from 'prosemirror-commands';
import { levenshtein, randomString, SetAttrsStep } from '../utils';
import { Fragment, NodeRange, Slice } from 'prosemirror-model';
import { TextNode } from 'prosemirror-model/src/node';
import { liftTarget, ReplaceAroundStep, ReplaceStep } from 'prosemirror-transform';

window.TextSelection = TextSelection

function textRange(node, from, to) {
  const range = document.createRange()
  range.setEnd(node, to == null ? node.nodeValue.length : to)
  range.setStart(node, from || 0)
  return range
}

function singleRect(object, bias) {
  const rects = object.getClientRects()
  return !rects.length ? object.getBoundingClientRect() : rects[bias < 0 ? 0 : rects.length - 1]
}

function coordsAtPos(view, pos, end = false) {
  const { node, offset } = view.docView.domFromPos(pos)
  let side
  let rect
  if (node.nodeType === 3) {
    if (end && offset < node.nodeValue.length) {
      rect = singleRect(textRange(node, offset - 1, offset), -1)
      side = 'right'
    }
    else if (offset < node.nodeValue.length) {
      rect = singleRect(textRange(node, offset, offset + 1), -1)
      side = 'left'
    }
  }
  else if (node.firstChild) {
    if (offset < node.childNodes.length) {
      const child = node.childNodes[offset]
      rect = singleRect(child.nodeType === 3 ? textRange(child) : child, -1)
      side = 'left'
    }
    if ((!rect || rect.top === rect.bottom) && offset) {
      const child = node.childNodes[offset - 1]
      rect = singleRect(child.nodeType === 3 ? textRange(child) : child, 1)
      side = 'right'
    }
  }
  else {
    rect = node.getBoundingClientRect()
    side = 'left'
  }

  const x = rect[side]
  return {
    top: rect.top,
    bottom: rect.bottom,
    left: x,
    right: x
  }
}

function getNode(state) {
  const { $from, $to, $cursor } = state.selection;
  let nodes = [];
  state.doc.nodesBetween($from.pos, $to.pos, (parentNode, parentPos) => {
    parentNode.forEach((node, offset, index) => {
      let absolutePos = parentPos + offset + 1;
      if ($from.pos === absolutePos && $to.pos === absolutePos + 1 && node.type.name === 'citation') {
        nodes.push({ pos: absolutePos, node, parent: parentNode, index });
      }
    });
  });
  if (nodes.length === 1) {
    return nodes[0];
  }
  return null;
}

class Citation {
  constructor(state, options) {
    this.options = options;
    this.popup = {
      isActive: false
    }
    // this.onOpenUrl = options.onOpenUrl;
  }

  update(state, oldState) {
    if (!this.view) {
      this.popup = { ...this.popup, isActive: false };
      return;
    }

    let node = getNode(state);

    let pos;
    let index;
    let parent;
    if (node) {
      pos = node.pos;
      index = node.index;
      parent = node.parent;
      node = node.node;
    }
    if (node) {
      let { from, to } = state.selection;

      // TODO: Should be withing the bounds of the highlight

      // These are in screen coordinates
      // We can't use EditorView.cordsAtPos here because it can't handle linebreaks correctly
      // See: https://github.com/ProseMirror/prosemirror-view/pull/47
      let start = coordsAtPos(this.view, from)
      let end = coordsAtPos(this.view, to, true)
      let isMultiline = start.top !== end.top;
      let left = isMultiline ? start.left : start.left + (end.left - start.left) / 2;

      let dom = this.view.nodeDOM(pos);
      let rect = dom.getBoundingClientRect()

      this.popup = {
        isActive: true,
        left,
        top: start.top,
        bottom: end.bottom,
        isMultiline,
        pos: from,
        rect,
        open: () => {
          this.options.onOpen(node)
        },
        edit: () => {
          this.options.onEdit(node)
        },
      };
      return;
    }

    this.popup = {
      isActive: false
    };
  }

  destroy() {
    this.popup = { ...this.popup, isActive: false };
  }
}

export let citationKey = new PluginKey('citation');

export function citation(options) {
  return new Plugin({
    key: citationKey,
    state: {
      init(config, state) {
        return new Citation(state, options);
      },
      apply(tr, pluginState, oldState, newState) {
        return pluginState;
      }
    },
    view: (view) => {
      let pluginState = citationKey.getState(view.state);
      pluginState.view = view;
      return {
        update(view, lastState) {
          pluginState.update(view.state, lastState);
        },
        destroy() {
          pluginState.destroy();
        }
      }
    }
  });
}
