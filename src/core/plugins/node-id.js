import { Plugin, PluginKey } from 'prosemirror-state';
import { randomString } from '../utils';

function addOrDeduplicateIds(state) {
  let nodeIds = [];
  let tr = state.tr;
  let updated = false;
  state.doc.descendants((node, pos) => {
    if (node.type.attrs.nodeId) {
      let nodeId = node.attrs.nodeId;
      if (!nodeId || nodeIds.includes(nodeId)) {
        nodeId = randomString();
        tr.setNodeMarkup(pos, null, {
          ...node.attrs,
          nodeId
        });
        updated = true;
      }
    }
  });

  return updated && tr || null;
}

export function nodeId(options) {
  return new Plugin({
    appendTransaction(transactions, oldState, newState) {
      return addOrDeduplicateIds(newState);
    }
  });
}
