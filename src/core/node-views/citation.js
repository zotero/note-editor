import { formatCitation } from '../utils';

class CitationView {
	constructor(node, view, getPos, options) {
		this.dom = document.createElement('span');
		this.dom.className = 'citation';

		let formattedCitation = '{citation}';
		try {
			let citation = JSON.parse(JSON.stringify(node.attrs.citation));
			options.metadata.fillCitationItemsWithData(citation.citationItems);
			let missingItemData = citation.citationItems.find(x => !x.itemData);
			if (missingItemData) {
				formattedCitation = node.textContent;
			}
			else {
				let text = formatCitation(citation);
				if (text) {
					formattedCitation = '(' + text + ')';
				}
			}
		}
		catch (e) {
			console.log(e);
		}
		this.dom.innerHTML = formattedCitation;
	}

	selectNode() {
		this.dom.classList.add('selected');
	}

	deselectNode() {
		this.dom.classList.remove('selected');
	}

	destroy() {
	}
}

export default function (options) {
	return function (node, view, getPos) {
		return new CitationView(node, view, getPos, options);
	};
}
