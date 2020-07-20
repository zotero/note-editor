import { DOMParser, DOMSerializer } from 'prosemirror-model';
import { schema } from './index';
import { encodeObject } from '../utils';

export function buildToHtml(schema) {
  return function (content) {
    let fragment = DOMSerializer.fromSchema(schema).serializeFragment(content);
    let tmp = document.createElement('div');
    tmp.appendChild(fragment);

    // <code> is excluded because it appears inside <pre> tag which results to unexpected \n growth
    let nodes = tmp.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, br, hr, pre, blockquote, table, tr');
    for (let node of nodes) {
      let newLineTextNode = document.createTextNode('\n');
      node.parentNode.insertBefore(newLineTextNode, node.nextSibling);
    }
    return tmp.innerHTML.trim();
  }
}

export function buildFromHtml(schema) {
  return function (html) {
    let domNode = document.createElement('div');
    domNode.innerHTML = html;
    let fragment = document.createDocumentFragment();
    while (domNode.firstChild) {
      fragment.appendChild(domNode.firstChild);
    }
    return DOMParser.fromSchema(schema).parse(fragment);
  }
}

export function buildClipboardSerializer(schema) {
  let base = DOMSerializer.fromSchema(schema);
  return new DOMSerializer(Object.assign({}, base.nodes, {
    image(node) {
      return ['img', {
        src: node.attrs.dataUrl,
        alt: node.attrs.alt,
        'data-annotation': encodeObject(node.attrs.annotation)
      }];
    }
  }), base.marks);
}
