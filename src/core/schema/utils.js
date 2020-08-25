import { DOMParser, DOMSerializer, Schema } from 'prosemirror-model';
import { schema } from './index';
import { encodeObject } from '../utils';

export function buildToHtml(schema) {
  return function (content) {
    let fragment = DOMSerializer.fromSchema(schema).serializeFragment(content);
    let tmp = document.implementation.createHTMLDocument('New').body;
    tmp.appendChild(fragment);

    let textNodes = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre'
    ];

    let blockNodes = [
      'ol', 'ul', 'li', 'br', 'hr', 'blockquote', 'table', 'th', 'tr', 'td', 'thead', 'tbody', 'tfoot'
    ]

    let nodes = tmp.querySelectorAll([...textNodes, ...blockNodes].join(','));
    for (let node of nodes) {
      if (blockNodes.includes(node.nodeName.toLowerCase())) {
        node.insertBefore(document.createTextNode('\n'), node.firstChild);
      }
      node.parentNode.insertBefore(document.createTextNode('\n'), node.nextSibling);
    }
    return tmp.innerHTML.trim();
  }
}

export function buildFromHtml(schema) {
  return function (html, slice) {
    let domNode = document.createElement('div');
    domNode.innerHTML = html;
    let fragment = document.createDocumentFragment();
    while (domNode.firstChild) {
      fragment.appendChild(domNode.firstChild);
    }
    if (slice) {
      return DOMParser.fromSchema(schema).parseSlice(fragment);
    }
    else {
      return DOMParser.fromSchema(schema).parse(fragment);
    }
  }
}

export function buildClipboardSerializer(provider, schema) {
  let base = DOMSerializer.fromSchema(schema);
  return new DOMSerializer(Object.assign({}, base.nodes, {
    image(node) {
      let src = node.attrs.src;
      let data = provider.getCachedData(node.attrs.nodeId, 'image');
      if (data) {
        src = data.src;
      }

      return ['img', {
        src,
        alt: node.attrs.alt,
        title: node.attrs.title,
        width: node.attrs.width,
        height: node.attrs.height,
        'data-annotation': node.attrs.annotation && encodeObject(node.attrs.annotation)
      }];
    },
    citation(node) {
      let text = '';
      let data = provider.getCachedData(node.attrs.nodeId, 'citation');
      if (data) {
        text = '(' + data.formattedCitation + ')';
      }

      return ['span', {
        class: 'citation',
        'data-citation': node.attrs.citation && encodeObject(node.attrs.citation)
      }, text];
    },
    highlight(node) {
      return ['span', {
        class: 'highlight',
        style: 'background-color: #ffff00',
        'data-annotation': encodeObject(node.attrs.annotation)
      }, 0]
    }
  }), base.marks);
}
