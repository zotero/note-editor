import { Plugin, TextSelection } from 'prosemirror-state';

export function highlight(options) {
  return new Plugin({
    props: {
      handleDoubleClickOn: (view, pos, node, nodePos, event) => {
        if (node.type.name === 'highlight') {
          // view.dispatch(view.state.tr.setSelection(new TextSelection(view.state.tr.selection.$from, view.state.tr.selection.$from)));
          event.preventDefault();
          options.onDoubleClick(node);
        }
      }
    }
  });
}
