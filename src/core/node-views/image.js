class ImageView {
  constructor(node, view, getPos) {
    let img = document.createElement('img');
    img.onload = (event) => {
      view.dispatch(view.state.tr.setNodeMarkup(getPos(), null, {
        ...view.state.doc.nodeAt(getPos()).attrs,
        width: event.target.naturalWidth,
        height: event.target.naturalHeight
      }));

      this.dom.style.paddingBottom = '';
      img.style.display = 'block';
    }

    img.setAttribute('alt', node.attrs.alt);
    img.setAttribute('src', node.attrs.dataUrl);
    img.style.display = 'none';

    this.img = img;

    let div = document.createElement('div');
    div.style.width = '100%';
    div.style.paddingBottom = node.attrs.height / node.attrs.width * 100 + '%';
    div.style.backgroundColor = 'lightgray';
    div.appendChild(img);
    this.dom = div;
  }

  selectNode() {
    this.dom.classList.add('selected');
  }

  deselectNode() {
    this.dom.classList.remove('selected');
  }

  update(node) {
    if (node.type.name !== 'image') return false;
    this.img.setAttribute('alt', node.attrs.alt);
    this.img.setAttribute('src', node.attrs.dataUrl);
    return true
  }
}

export default function (node, view, getPos) {
  return new ImageView(node, view, getPos)
}
