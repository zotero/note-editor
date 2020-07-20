class CitationView {
  constructor(node, view, getPos) {
    this.dom = document.createElement('span')
    this.dom.className = 'citation';
    this.dom.innerHTML = node.attrs.content ? '(' + node.attrs.content + ')' : '{citation}';
  }

  selectNode() {
    this.dom.classList.add('selected');
  }

  deselectNode() {
    this.dom.classList.remove('selected');
  }

  update(node) {
    if (node.type.name !== 'citation') return false;
    this.dom.innerHTML = node.attrs.content ? '(' + node.attrs.content + ')' : '{citation}';
    return true
  }
}

export default function (node, view, getPos) {
  return new CitationView(node, view, getPos)
}
