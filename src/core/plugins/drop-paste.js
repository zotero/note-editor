import { Plugin } from 'prosemirror-state';
import { Fragment, Slice } from 'prosemirror-model';

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png'
];

const IMAGE_DATA_URL_MAX_LENGTH = 20 * 1000 * 1000;

function isImageValid(node) {
  let { src, attachmentKey } = node.attrs;
  return !(
    // Missing src and attachmentKey
    !src && !attachmentKey
    // Is a data URL but has an unsupported MIME type
    || src.startsWith('data:') && !IMAGE_MIME_TYPES.includes(src.slice(5).split(/[,;]/)[0])
    // Data URL is too long
    || src.length > IMAGE_DATA_URL_MAX_LENGTH
  );
}

function transformFragment(schema, fragment) {
  const nodes = [];
  for (let i = 0; i < fragment.childCount; i++) {
    const child = fragment.child(i);
    if (child.type === schema.nodes.image && !isImageValid(child)) {
      continue;
    }
    nodes.push(child.copy(transformFragment(schema, child.content)));
  }
  return Fragment.fromArray(nodes);
}

function transformSlice(schema, slice) {
  const fragment = transformFragment(schema, slice.content);
  if (fragment) {
    return new Slice(fragment, slice.openStart, slice.openEnd);
  }
}

// TODO: Fix drop/paste into inline code
// TODO: Limit pasted images width to the default value
export function dropPaste(options) {
  return new Plugin({
    props: {
      handlePaste(view, event, slice) {
        let data;
        if (data = event.clipboardData.getData('zotero/annotation')) {
          options.onInsertObject('zotero/annotation', data);
          return true;
        }

        let text = event.clipboardData.getData('text/plain');
        let html = event.clipboardData.getData('text/html');
        if (!event.shiftKey && html) {
          let { state, dispatch } = view;
          slice = transformSlice(view.state.schema, slice);
          dispatch(state.tr.replaceSelection(slice).setMeta('importImages', true));
          return true;
        }
        return false;
      },
      handleDrop(view, event, slice, moved) {
        let text = event.dataTransfer.getData('text/plain');
        let html = event.dataTransfer.getData('text/html');
        let pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        let data;
        if (data = event.dataTransfer.getData('zotero/annotation')) {
          options.onInsertObject('zotero/annotation', data, pos.pos);
          return true
        }
        else if (data = event.dataTransfer.getData('zotero/item')) {
          options.onInsertObject('zotero/item', data, pos.pos);
          return true;
        }

        if (!moved && html) {
          let { state, dispatch } = view;
          slice = transformSlice(view.state.schema, slice);
          dispatch(state.tr.replaceRange(pos.pos, pos.pos, slice).setMeta('importImages', true));
          return true;
        }
        return false;
      }
    }
  });
}
