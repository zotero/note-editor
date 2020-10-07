export function digestHtml(html) {
  let metadata = {
    schemaVersion: 0
  };
  let doc = document.implementation.createHTMLDocument('');
  let container = doc.body;
  container.innerHTML = html;

  let metadataNode = doc.querySelector('body > div[data-schema-version]');
  if (metadataNode) {
    let value = parseInt(metadataNode.getAttribute('data-schema-version'));
    if (Number.isInteger(value) && value > 0) {
      metadata.schemaVersion = value;
    }
  }

  function createLink(url) {
    let a = doc.createElement('a');
    a.href = url;
    a.appendChild(doc.createTextNode(url));
    return a;
  }

  function createImage(src) {
    let img = doc.createElement('img');
    img.src = src;
    return img;
  }

  function walk(elm) {
    let node;
    for (node = elm.firstChild; node; node = node.nextSibling) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.style) {
          if (node.style.backgroundImage) {
            let matched = node.style.backgroundImage.match(/url\(["']?([^"']*)["']?\)/);
            if (matched) {
              node.parentElement.insertBefore(createImage(matched[1]), node);
            }
          }
        }

        if (node.nodeName !== 'IMG' && node.getAttribute('src')) {
          node.parentElement.insertBefore(createLink(node.getAttribute('src')), node);
        }
        walk(node);
      }
    }
  }

  walk(container);

  return { html: container.innerHTML, metadata };
}

// Additional transformations that can't be described with schema alone
export function schemaTransform(state) {
  let { tr } = state;
  let updated = false;
  state.doc.descendants((node, pos) => {
    // Do not allow to be wrapped in any mark
    if (['image', 'citation', 'highlight'].includes(node.type.name) && node.marks.length) {
      tr.setNodeMarkup(pos, null, node.attrs, []);
      updated = true;
    }
    // Force inline code to have only plain text
    else if (!node.isText && node.marks.find(mark => mark.type.name === 'code')) {
      tr.removeMark(pos, pos + 1, state.schema.marks.code);
      updated = true;
    }
  });
  return updated && tr || null;
}
