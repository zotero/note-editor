class ImageView {
  constructor(node, view, getPos, options) {
    if (node.attrs.attachmentKey) {
      this.listener = (data) => {
        this.img.onload = (event) => {
          if (node.attrs.attachmentKey && (node.attrs.naturalWidth !== event.target.naturalWidth
            || node.attrs.naturalHeight !== event.target.naturalHeight)) {
            options.onDimensions(node, event.target.naturalWidth, event.target.naturalHeight);
          }
          this.img.parentNode.style.paddingBottom = '';
          this.img.style.display = 'block';
        }
        this.img.src = data.src;
      }

      this.provider = options.provider;
      this.provider.subscribe({
        type: 'image',
        nodeId: node.attrs.nodeId,
        data: {
          attachmentKey: node.attrs.attachmentKey
        },
        listener: this.listener
      });

      let imageBlock = document.createElement('div');
      imageBlock.className = 'regular-image';

      let resizedWrapper = document.createElement('div');
      resizedWrapper.className = 'resized-wrapper';

      let maxWidth = 600;

      if (node.attrs.naturalWidth && node.attrs.naturalWidth < 600) {
        maxWidth = node.attrs.naturalWidth;
      }

      resizedWrapper.style.width = node.attrs.width !== null ? (node.attrs.width + 'px') : maxWidth + 'px';//'100%';

      imageBlock.appendChild(resizedWrapper);

      let img = document.createElement('img');
      img.alt = node.attrs.alt;
      img.style.display = 'none';
      let div = document.createElement('div');
      div.className = 'image' + (node.attrs.annotation ? ' annotation' : '');
      if (node.attrs.naturalHeight !== null && node.attrs.naturalWidth !== null) {
        div.style.paddingBottom = node.attrs.naturalHeight / node.attrs.naturalWidth * 100 + '%';
      }
      div.appendChild(img);

      resizedWrapper.appendChild(div)

      div.ondblclick = event => {
        event.preventDefault();
        options.onDoubleClick(node);
      }

      this.dom = imageBlock;
      this.img = img;
    }
    else if (node.attrs.src) {
      this.img = null;
      let div = document.createElement('div');
      div.className = 'external-image';

      let resizedWrapper = document.createElement('div');
      resizedWrapper.className = 'resized-wrapper';
      div.appendChild(resizedWrapper);

      let divLeft = document.createElement('div');
      divLeft.className = 'image';
      let divRight = document.createElement('div');
      divRight.className = 'link';

      let img = document.createElement('img');
      img.src = node.attrs.src;
      divLeft.appendChild(img);

      if (node.attrs.src) {
        let a = document.createElement('a');
        a.href = node.attrs.src;
        a.onclick = (event) => {
          event.preventDefault();
          options.onOpenUrl(event.target.href);
        }
        let host = 'unknown';
        try {
          host = (new URL(node.attrs.src)).host;
        } catch(e) {

        }
        a.appendChild(document.createTextNode(host));
        divRight.appendChild(a);
      }

      resizedWrapper.appendChild(divLeft);
      resizedWrapper.appendChild(divRight);

      this.dom = div;
    }
    else {
      this.img = null;
      let div = document.createElement('div');
      div.className = 'import-placeholder-image';

      let image = document.createElement('div');
      image.className = 'image';
      div.appendChild(image);
      this.dom = div;
    }
  }

  selectNode() {
    this.dom.classList.add('selected');
  }

  deselectNode() {
    this.dom.classList.remove('selected');
  }

  destroy() {
    if (this.provider) {
      this.provider.unsubscribe(this.listener);
    }
  }
}

export default function (options) {
  return function (node, view, getPos) {
    return new ImageView(node, view, getPos, options);
  }
}
