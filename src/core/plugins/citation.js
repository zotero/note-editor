import { randomString } from '../utils';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { pluginKey } from './image';

export function _setFormattedCitations(citationPreviews) {
  return function (state, dispatch) {
    let tr = state.tr;
    let updated = false;
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'citation') {
        let citationPreview = citationPreviews[node.attrs.id];
        if (citationPreview && node.attrs.content !== citationPreview) {
          updated = true;
          tr.setNodeMarkup(pos, null, {
            id: node.attrs.id,
            content: citationPreview,
            citation: node.attrs.citation
          });
        }
      }


      return true;
    });


    if (updated) {
      dispatch(tr.setMeta('addToHistory', false));
    }
  };


}

export function _updateCitation(id, citation, formattedCitation) {
  return function (state, dispatch) {
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'citation' && node.attrs.id === id) {
        dispatch(state.tr.setNodeMarkup(pos, null, {
          ...node.attrs,
          citation,
          content: formattedCitation
        }));
        return false;
      }
      return true;
    });
  };
}

function initCitations(state) {
  let citations = [];
  let tr = state.tr;
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'citation' && node.attrs.citation) {
      let id = node.attrs.id;
      if (!id) {
        id = randomString();
        tr.setNodeMarkup(pos, null, {
          ...node.attrs,
          id
        });

        citations.push({
          id,
          ...node.attrs.citation
        });
      }
    }
  });

  return { tr, citations };
}

export function citation(options) {
  return new Plugin({
    props: {
      handleClickOn: (view, pos, node, nodePos, event) => {
        if (event.button !== 0) {
          return;
        }
        if (node.type.name === 'citation') {
          options.onClick(node);
        }
      },
      handleDoubleClickOn: (view, pos, node, nodePos, event) => {
        if (node.type.name === 'citation') {
          view.dispatch(view.state.tr.setSelection(new TextSelection(view.state.tr.selection.$from, view.state.tr.selection.$from)));
          options.onDoubleClick(node);
        }
      }
    },
    view(view) {
      let { tr, citations } = initCitations(view.state);
      if (citations.length) {
        options.onGetFormattedCitations(citations);
        view.dispatch(tr.setMeta('addToHistory', false));

      }


      return {}
    },
    appendTransaction(transactions, oldState, newState) {
      let { tr, citations } = initCitations(newState);
      if (citations.length) {
        options.onGetFormattedCitations(citations);
      }
      return tr;
    }
  });
}
