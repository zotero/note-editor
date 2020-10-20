import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { fromHtml, schema } from '../schema';
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
      if (node.type.name === 'highlight') {
        if ($from.pos > absolutePos + 1 && $to.pos < absolutePos + node.nodeSize - 1) {
          nodes.push({ pos: absolutePos, node, parent: parentNode, index });
        }
      }
    });
  });
  if (nodes.length === 1) {
    return nodes[0];
  }
  return null;
}

class Highlight {
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

      let next = this.view.state.doc.resolve(pos);

      let citation = null;
      for (let i = index + 1; i < parent.childCount; i++) {
        let child = parent.child(i);
        if (child.type.name === 'citation') {
          if (this.citationHasUri(child.attrs.citation, node.attrs.annotation.parentURI)
            || this.citationHasUri(child.attrs.citation, node.attrs.annotation.uri)
          ) {
            citation = child;
          }
          break;
        }
        else if (child.type.name === 'text') {
          if (child.text.trim().length) {
            break;
          }
        }
        else {
          break;
        }
      }

      this.popup = {
        isActive: true,
        left,
        top: start.top,
        bottom: end.bottom,
        isMultiline,
        pos: from,
        rect,
        enableAddCitation: !citation,
        open: this.open.bind(this),
        unlink: this.unlink.bind(this),
        addCitation: this.addCitation.bind(this)
      };
      return;
    }

    this.popup = {
      isActive: false
    };
  }

  open() {
    let { $from } = this.view.state.selection;
    let node = $from.parent;
    if (node.attrs.annotation) {
      this.options.onOpen(node.attrs.annotation);
    }
  }

  unlink() {
    let { state, dispatch } = this.view;
    let { $from } = state.selection;
    let pos = $from.pos - $from.parentOffset - 1;
    let node = $from.parent;
    let tr = state.tr.step(new ReplaceAroundStep(pos, pos + node.nodeSize, pos + 1, pos + 1 + node.content.size, Slice.empty, 0))
    dispatch(tr);
  }

  addCitation() {
    let { state, dispatch } = this.view;
    let { tr } = state;
    let { $from } = state.selection;
    let node = $from.parent;
    let pos = $from.pos - $from.parentOffset + node.nodeSize - 1;

    let nodes = [];
    nodes.push(state.schema.text(' '));
    nodes.push(state.schema.nodes.citation.create({
      nodeId: randomString(),
      citation: {
        citationItems: [node.attrs.annotation.citationItem],
        properties: {}
      }
    }));

    dispatch(tr.insert(pos, nodes));
  }

  citationHasUri(citation, uri) {
    for (let citationItem of citation.citationItems) {
      if (citationItem.uris.includes(uri)) {
        return true;
      }
    }
    return false;
  }

  destroy() {
    this.popup = { ...this.popup, isActive: false };
  }
}

function unlinkHighlights(tr) {
  let nodeIds = [];
  let updated = false;
  tr.doc.descendants((node, pos) => {
    if (node.type.name === 'highlight') {
      if (node.content instanceof Fragment && node.content.content.length) {
        let first = node.content.content[0];
        let last = node.content.content[node.content.content.length - 1];
        let text = node.textContent;
        text = text.slice(1, -1).toLowerCase().replace(/[\s\.-]/g, '');

        let drifted = false;
        if (node.attrs.annotation.text) {
          let originalText = node.attrs.annotation.text.toLowerCase()
          .replace(/<\/?(b|i|sub|sup)>/g, '')
          .replace(/[\s\.-]/g, '');

          let dist = levenshtein(text, originalText);

          if (dist && dist / originalText.length > 0.1) {
            drifted = true;
          }
        }

        if (drifted || first.text[0] !== '“' || last.text[last.text.length - 1] !== '”') {
          pos = tr.mapping.map(pos);
          tr = tr.step(new ReplaceAroundStep(pos, pos + node.nodeSize, pos + 1, pos + 1 + node.content.size, Slice.empty, 0))
          updated = true;
        }
      }
    }
  });

  return updated && tr || null;
}

function handleEnter(state, dispatch) {
  const { schema } = state
  const { $from, $to } = state.selection
  // No selection & the cursor inside word-node
  if ($from.pos === $to.pos && $from.parent.type === schema.nodes.highlight) {
    const blockParent = $from.node(1);
    const newBlock = blockParent.type.create(blockParent.attrs)
    // node like the block parent with an empty inline node in it
    let block = blockParent.copy();
    // Slice that opens both nodes at both sides, so that only the inner close-and-then-open
    // tokens are part of it
    let slice = new Slice(new Fragment([block]), 0, 1)
    let tr = state.tr.replace($from.pos, $from.pos, slice)
    dispatch(tr)
    return true
  }
}

export let highlightKey = new PluginKey('highlight');

export function highlight(options) {
  return new Plugin({
    key: highlightKey,
    state: {
      init(config, state) {
        return new Highlight(state, options);
      },
      apply(tr, pluginState, oldState, newState) {
        return pluginState;
      }
    },
    view: (view) => {
      let pluginState = highlightKey.getState(view.state);
      pluginState.view = view;
      return {
        update(view, lastState) {
          pluginState.update(view.state, lastState);
        },
        destroy() {
          pluginState.destroy();
        }
      }
    },
    appendTransaction(transactions, oldState, newState) {
      let { tr: trr } = newState;
      let updated = false;
      if (newState.selection.empty) {
        transactions.forEach(tr => {
          tr.steps.forEach(step => {
            if (step instanceof ReplaceStep && step.slice) {
              step.getMap().forEach((oldStart, oldEnd, newStart, newEnd) => {
                let $pos = oldState.doc.resolve(oldStart);
                if ($pos.parent.type.name === 'highlight') {
                  if ($pos.parentOffset === 0) {
                    trr = trr.delete(newStart, newEnd);
                    trr = trr.replace(newStart - 1, newStart - 1, step.slice);
                    updated = true;
                  }
                  else if ($pos.parentOffset === $pos.parent.content.size) {
                    trr = trr.delete(newStart, newEnd);
                    trr = trr.replace(newStart + 1, newStart + 1, step.slice);
                    trr = trr.setSelection(new TextSelection(trr.doc.resolve(newStart + step.slice.size + 1)))
                    updated = true;
                  }
                }
              });
            }
          });
        });
      }

      let res = unlinkHighlights(trr);

      if (res) return res;

      return updated && trr || null;
    },

    filterTransaction(tr, state) {
      let { from, to } = state.selection;
      let filter = false;
      if (from === to && tr.steps.length === 1) {
        let step = tr.steps[0];
        state.doc.nodesBetween(step.from, step.to, (parentNode, parentPos) => {
          if (parentNode.type.name === 'highlight' && parentPos === step.from && parentPos + parentNode.nodeSize === step.to) {
            if (from === step.from) {
              filter = true;
              setTimeout(() => {
                let pluginState = highlightKey.getState(state);
                let { dispatch } = pluginState.view;
                dispatch(pluginState.view.state.tr.delete(from + 1, from + 2))
              }, 0);
            }
            else if (from === step.to) {
              filter = true;
              setTimeout(() => {
                let pluginState = highlightKey.getState(state);
                let { dispatch } = pluginState.view;
                dispatch(pluginState.view.state.tr.delete(from - 2, from - 1))
              }, 0);
            }
          }
        });
      }
      return !filter;
    },

    props: {
      handleKeyDown(view, event) {
        if (event.key === 'Enter') {
          handleEnter(view.state, view.dispatch);
        }
      }
    }
  });
}
