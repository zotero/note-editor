import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export function placeholder(options) {
  return new Plugin({
    props: {
      decorations: state => {
        const decorations = [];
        if (options.text && state.doc.content.childCount === 1) {
          state.doc.descendants((node, pos) => {
            if (node.type.isBlock && node.childCount === 0 /*&& state.selection.$anchor.parent !== node*/) {
              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: 'empty-node',
                  'data-placeholder': options.text
                })
              )
            }
            return false;
          });
        }
        return DecorationSet.create(state.doc, decorations)
      }
    }
  });
}
