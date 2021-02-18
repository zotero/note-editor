class ImageView {
	constructor(node, view, getPos, options) {
		if (node.attrs.attachmentKey) {
			this.listener = (data) => {
				// If image is modified and dimensions are changed,
				// it will be displayed with invalid aspect ratio
				this.img.onload = (event) => {
					if (node.attrs.width === null || node.attrs.height === null) {
						// Use natural image dimensions if neither width nor height is provided
						let width = event.target.naturalWidth;
						let height = event.target.naturalHeight;
						// Calculate proportional height if only width is known
						if (node.attrs.width !== null) {
							width = node.attrs.width;
							height = event.target.naturalHeight * node.attrs.width / event.target.naturalWidth;
						}
						// Calculate proportional width if only height is known
						if (node.attrs.height !== null) {
							width = event.target.naturalWidth * node.attrs.height / event.target.naturalHeight;
							height = node.attrs.height;
						}
						options.onDimensions(node, width, height);
					}
					this.img.parentNode.style.paddingBottom = '';
					this.img.style.display = 'block';
				};
				this.img.src = data.src;
			};

			this.provider = options.provider;
			this.provider.subscribe({
				type: 'image',
				nodeID: node.attrs.nodeID,
				data: {
					attachmentKey: node.attrs.attachmentKey
				},
				listener: this.listener
			});

			let imageBlock = document.createElement('div');
			imageBlock.className = 'regular-image';

			let resizedWrapper = document.createElement('div');
			resizedWrapper.className = 'resized-wrapper';

			if (node.attrs.width !== null && node.attrs.height !== null) {
				resizedWrapper.style.width = node.attrs.width + 'px';
			}

			imageBlock.appendChild(resizedWrapper);

			let img = document.createElement('img');
			img.alt = node.attrs.alt;
			img.style.display = 'none';
			let div = document.createElement('div');
			div.className = 'image' + (node.attrs.annotation ? ' annotation' : '');
			if (node.attrs.width !== null && node.attrs.height !== null) {
				div.style.paddingBottom = node.attrs.height / node.attrs.width * 100 + '%';
			}
			div.appendChild(img);

			resizedWrapper.appendChild(div);

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
					options.onOpenURL(event.target.href);
				};
				let host = 'unknown';
				try {
					host = (new URL(node.attrs.src)).host;
				}
				catch (e) {

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
	};
}
