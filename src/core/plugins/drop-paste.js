import { Plugin } from 'prosemirror-state';
import { Fragment, Slice } from 'prosemirror-model';
import { schema } from '../schema';

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

async function insertImages(view, pos, files) {
  let { state, dispatch } = view;
  let nodes = [];
  let promises = [];
  for (let file of files) {
    if (IMAGE_MIME_TYPES.includes(file.type)) {
      promises.push(new Promise((resolve) => {
        let reader = new FileReader();
        reader.onload = function () {
          let dataUrl = this.result;
          nodes.push(schema.nodes.image.create({
            src: dataUrl
          }));
          resolve();
        }
        reader.onerror = () => {
          resolve();
        }
        reader.readAsDataURL(file);
      }))
    }
  }
  await Promise.all(promises);
  if (nodes.length) {
    dispatch(state.tr.insert(pos, nodes).setMeta('importImages', true));
  }
}

// TODO: Fix drop/paste into inline code
// TODO: Limit pasted images width to the default value
// NOTICE: Sometimes copying HTML from Chrome to the editor (no matter if
// it's running in Zotero or original FF) hangs for less than a second, and
// returns an empty value for `getData('text/html')`. Seems like a browser bug
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
        let text = event.dataTransfer.getData('text/plain') || window.droppedData && window.droppedData['text/plain'];
        let html = event.dataTransfer.getData('text/html') || window.droppedData && window.droppedData['text/html'];
        let pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        let data;
        if (event.dataTransfer.files.length) {
          insertImages(view, pos.pos, event.dataTransfer.files);
          return true;
        }
        else if (data = event.dataTransfer.getData('zotero/annotation')) {
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
