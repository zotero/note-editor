import { generateObjectKey } from '../utils';
import { Plugin, PluginKey } from 'prosemirror-state';


class Image {
  constructor(state, options) {
    this.onUpdateImages = options.onUpdateImages;
    this.onRequestImage = options.onRequestImage;
    this.loadingKeys = {};
  }

  getImageDiff(prevDoc, curDoc) {
    let prevKeys = [];
    prevDoc.descendants((node, pos) => {
      if (node.type.name === 'image' && node.attrs.attachmentKey) {
        prevKeys.push(node.attrs.attachmentKey);
      }
    });

    let all = [];
    let added = [];
    curDoc.descendants((node, pos) => {
      if (node.type.name === 'image' && node.attrs.attachmentKey) {
        if (!prevKeys.find(key => node.attrs.attachmentKey === key)) {
          added.push({
            attachmentKey: node.attrs.attachmentKey,
            dataUrl: node.attrs.dataUrl
          });
        }
        all.push({ attachmentKey: node.attrs.attachmentKey })
      }
    });

    return {
      all,
      added
    };
  }

  requestImages(doc) {
    let ids = [];
    doc.descendants((node, pos) => {
      if (node.type.name === 'image' && node.attrs.attachmentKey && !node.attrs.dataUrl) {
        if (!this.loadingKeys[node.attrs.attachmentKey]) {
          this.loadingKeys[node.attrs.attachmentKey] = true;
          this.onRequestImage(node.attrs.attachmentKey);
        }
      }
    });
  }

  updateImage(attachmentKey, dataUrl) {
    this.view.state.doc.descendants((node, pos) => {
      if (node.type.name === 'image' && node.attrs.attachmentKey === attachmentKey) {
        this.view.dispatch(this.view.state.tr.setNodeMarkup(pos, null, {
          ...node.attrs,
          dataUrl
        }).setMeta('addToHistory', false))

        delete this.loadingKeys[attachmentKey];
      }

      return true;
    });
  }

  update(tr, force) {
    if (tr.steps.length || force) {
      let imgDiff = this.getImageDiff(tr.before, tr.doc);
      this.onUpdateImages(imgDiff);
      this.requestImages(tr.doc);
    }
  }

}

export let imageKey = new PluginKey('image');

export function image(options) {
  return new Plugin({
    key: imageKey,
    state: {
      init(config, state) {
        return new Image(state, options);
      },
      apply(tr, pluginState, oldState, newState) {
        pluginState.update(tr, oldState, newState);
        return pluginState;
      }
    },
    view: (view) => {
      let pluginState = imageKey.getState(view.state);
      pluginState.view = view;
      pluginState.update(view.state.tr, true)
      return {}
    }
    // appendTransaction(transactions, oldState, newState) {
    //   return updateLinkOnChange(transactions, oldState, newState);
    // }
  });
}
