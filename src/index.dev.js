import React from 'react';
import ReactDOM from 'react-dom';
import { IntlProvider } from 'react-intl';

import Editor from './ui/editor';
import EditorCore from './core/editor-core';

import { imageStore, citationStore } from './index.dev.data';
import { TextSelection } from 'prosemirror-state';
import strings from './en-us.strings';


let beautify = require('js-beautify').html;

let deletedImages = {};

// Zotero item key
export function generateObjectKey() {
	let len = 8;
	let allowedKeyChars = '23456789ABCDEFGHIJKLMNPQRSTUVWXYZ';

	var randomstring = '';
	for (var i = 0; i < len; i++) {
		var rnum = Math.floor(Math.random() * allowedKeyChars.length);
		randomstring += allowedKeyChars.substring(rnum, rnum + 1);
	}
	return randomstring;
}

// Notice: This fails to fetch the image if the host has
// CORS restrictions
async function loadImageAsDataURL(url) {
	let blob = await fetch(url).then(r => r.blob());
	return await new Promise((resolve, reject) => {
		let reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

async function importImage(src) {
	if (!src) return null;
	if (src.startsWith('data:')) {

	}
	else {
		src = await loadImageAsDataURL(src);
	}

	let attachmentKey = generateObjectKey();

	imageStore[attachmentKey] = src;
	return attachmentKey;
}

function main(html) {
	window.dir = 'ltr';

	let font = {
		fontFamily: 'Lucida Grande, Tahoma, Verdana, Helvetica, sans-serif',
		fontSize: 14
	};

	let root = document.documentElement;
	root.style.setProperty('--font-family', font.fontFamily);
	root.style.setProperty('--font-size', font.fontSize + 'px');

	let resizing = false;
	document.getElementById('resizer').addEventListener('mousedown', () => {
		resizing = true;
	});

	window.addEventListener('mousemove', (event) => {
		if (resizing) {
			let x = event.clientX;
			root.style.setProperty('--width', x + 'px');
		}
	});

	window.addEventListener('mouseup', () => {
		resizing = false;
	});

	ReactDOM.unmountComponentAtNode(document.getElementById('editor-container'));


	let editorCore = new EditorCore({
		container: null,
		value: html,
		readOnly: false,
		unsaved: true,
		placeholder: 'This is a placeholder',
		isAttachmentNote: false,
		onSubscribe(subscriber) {
			console.log('onSubscribe', subscriber);
			if (subscriber.type === 'citation') {
				// setTimeout(function () {
				// 	let key = JSON.stringify(subscriber.data.citation);
				// 	if (citationStore[key]) {
				// 		editorCore.provider.notify(subscriber.id, 'citation', {
				// 			formattedCitation: citationStore[key]
				// 		});
				// 	}
				// 	//
				// 	// setTimeout(()=> {
				// 	//   this.editorCore.updateCitation(subscriber.id, subscriber.data.citation);
				// 	// }, 5000);
				// }, 0);
			}
			else if (subscriber.type === 'image') {
				setTimeout(function () {
					if (imageStore[subscriber.data.attachmentKey]) {
						editorCore.provider.notify(subscriber.id, {
							src: imageStore[subscriber.data.attachmentKey]
						});
					}
					else if (deletedImages[subscriber.data.attachmentKey]) {
						imageStore[subscriber.data.attachmentKey] = deletedImages[subscriber.data.attachmentKey];
						editorCore.provider.notify(subscriber.id, {
							src: imageStore[subscriber.data.attachmentKey]
						});
					}
				}, 0);
			}
		},
		onUnsubscribe(subscription) {
			console.log('onUnsubscribe', subscription);
		},
		async onImportImages(images) {
			console.log('onImportImages', images);
			for (let image of images) {
				let attachmentKey = await importImage(image.src);
				editorCore.attachImportedImage(image.nodeID, attachmentKey);
			}
		},
		onOpenURL(url) {
			console.log('onOpenURL(core)', url);
			window.open(url, '_blank');
		},
		onUpdate(system) {
			let noteData = editorCore.getData();
			let { html } = noteData;
			console.log('onUpdate', html.length, system);

			html = html.replace(/(data-annotation=".{5})(.*?)(.{5}")/g, '$1...$3');
			html = html.replace(/(data-citation=".{5})(.*?)(.{5}")/g, '$1...$3');
			html = html.replace(/(src=".{5})(.*?)(.{5}")/g, '$1...$3');
			let d = beautify(html, { indent_size: 2, space_in_empty_parent: true });
			document.getElementById('dev').classList.remove('prettyprinted');
			document.getElementById('dev').innerText = d;
			PR.prettyPrint();
		},
		onInsertObject(type, data, pos) {
			console.log('onInsertObject', type, data, pos);
			if (type === 'zotero/item') {
				let ids = data.split(',').map(id => parseInt(id));

				let citations = [];
				for (let id of ids) {
					citations.push(
						{
							citationItems: [
								{
									uri: 'uri1',
									backupText: 'item' + id
								}
							],
							properties: {}
						}
					);
				}

				editorCore.insertCitations(citations, pos);
			}
		},
		onUpdateCitationItemsList(list) {
			console.log('onUpdateCitationItemsList', list);
		},
		onOpenAnnotation(annotation) {
			console.log('onOpenAnnotation', annotation);
			alert('Opening annotation: ' + JSON.stringify(annotation));
		},
		onOpenCitation(citation) {
			console.log('onOpenCitation', citation);
			alert('Opening citation: ' + JSON.stringify(citation));
		},
		onOpenCitationPage: (citation) => {
			console.log('onOpenCitationPage', citation);
			alert('Opening citation: ' + JSON.stringify(citation));
		},
		onShowCitationItem: (citation) => {
			console.log('onShowCitationItem', citation);
			alert('Opening citation: ' + JSON.stringify(citation));
		},
		onOpenCitationPopup(id, citation) {
			console.log('onOpenCitationPopup', id, citation);
			alert('Open quick format citation dialog ' + id + ' ' + JSON.stringify(citation));
		},
		onOpenContextMenu: (pos, node, x, y) => {
			console.log('onOpenContextMenu', pos, node, x, y);
			console.log('nodeView', editorCore.getNodeView(pos));
		}
	});

	let dir = 'ltr';
	document.getElementsByTagName("html")[0].dir = dir;

	ReactDOM.render(
		<IntlProvider
			locale={window.navigator.language}
			messages={strings}
		>
			<Editor
				readOnly={false}
				disableUI={false}
				showUpdateNotice={false}
				enableReturnButton={true}
				viewMode="dev"
				editorCore={editorCore}
				onClickReturn={() => {
					console.log('Clicked return');
				}}
				onShowNote={() => {
					console.log('Show Note');
				}}
				onOpenWindow={() => {
					console.log('Open Window');
				}}
			/>
		</IntlProvider>,
		document.getElementById('editor-container')
	);

	window.editorCore = editorCore;
};

let html1 = `
<div data-citation-items="%5B%7B%22uris%22%3A%5B%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%5D%2C%22itemData%22%3A%7B%22id%22%3A%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%2C%22type%22%3A%22article-journal%22%2C%22abstract%22%3A%22A%20purely%20peer-to-peer%20version%20of%20electronic%20cash%20would%20allow%20online%20payments%20to%20be%20sent%20directly%20from%20one%20party%20to%20another%20without%20going%20through%20a%20financial%20institution.%20Digital%20signatures%20provide%20part%20of%20the%20solution%2C%20but%20the%20main%20benefits%20are%20lost%20if%20a%20trusted%20third%20party%20is%20still%20required%20to%20prevent%20double-spending.%20We%20propose%20a%20solution%20to%20the%20double-spending%20problem%20using%20a%20peer-to-peer%20network.%20The%20network%20timestamps%20transactions%20by%20hashing%20them%20into%20an%20ongoing%20chain%20of%20hash-based%20proof-of-work%2C%20forming%20a%20record%20that%20cannot%20be%20changed%20without%20redoing%20the%20proof-of-work.%20The%20longest%20chain%20not%20only%20serves%20as%20proof%20of%20the%20sequence%20of%20events%20witnessed%2C%20but%20proof%20that%20it%20came%20from%20the%20largest%20pool%20of%20CPU%20power.%20As%20long%20as%20a%20majority%20of%20CPU%20power%20is%20controlled%20by%20nodes%20that%20are%20not%20cooperating%20to%20attack%20the%20network%2C%20they'll%20generate%20the%20longest%20chain%20and%20outpace%20attackers.%20The%20network%20itself%20requires%20minimal%20structure.%20Messages%20are%20broadcast%20on%20a%20best%20effort%20basis%2C%20and%20nodes%20can%20leave%20and%20rejoin%20the%20network%20at%20will%2C%20accepting%20the%20longest%20proof-of-work%20chain%20as%20proof%20of%20what%20happened%20while%20they%20were%20gone.%22%2C%22language%22%3A%22en%22%2C%22page%22%3A%229%22%2C%22source%22%3A%22Zotero%22%2C%22title%22%3A%22Bitcoin%3A%20A%20Peer-to-Peer%20Electronic%20Cash%20System%22%2C%22author%22%3A%5B%7B%22family%22%3A%22Nakamoto%22%2C%22given%22%3A%22Satoshi%22%7D%5D%7D%7D%5D" data-schema-version="5">
<p>Paragraph - <strong>B</strong><em>I</em><u>U</u><span style="text-decoration: line-through">S</span><sub>2</sub><sup>2</sup><span style="color: #99CC00">T</span><span style="background-color: #99CC00">B</span><a href="g">L</a><code>C</code></p>
<h1>Heading 1 - <strong>B</strong><em>I</em><u>U</u><span style="text-decoration: line-through">S</span><sub>2</sub><sup>2</sup><span style="color: #99CC00">T</span><span style="background-color: #99CC00">B</span><a href="g">L</a><code>C</code></h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
<h4>Heading 4</h4>
<h5>Heading 5</h5>
<h6>Heading 6</h6>

<p dir="rtl">rtl</p>
<h1 dir="rtl">rtl</h1>

<ol dir="rtl">
	<li><p>test1</p></li>
	<li><p>test2</p></li>
	<li><p>test3</p></li>
</ol>

<ul dir="rtl">
	<li><p>test1</p></li>
	<li><p>test2</p></li>
	<li><p>test3</p></li>
</ul>

<h2>Annotations</h2>
<p><span class="underline" data-annotation="%7B%22attachmentURI%22%3A%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FC6IDLDLW%22%2C%22annotationKey%22%3A%222ESAYRD9%22%2C%22color%22%3A%22%235fb236%22%2C%22pageLabel%22%3A%221%22%2C%22position%22%3A%7B%22pageIndex%22%3A0%2C%22rects%22%3A%5B%5B108.1%2C373.615%2C504.091%2C384.8%5D%2C%5B108.1%2C362.015%2C324.159%2C373.2%5D%5D%7D%2C%22citationItem%22%3A%7B%22uris%22%3A%5B%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%5D%2C%22locator%22%3A%221%22%7D%7D"><u style="text-decoration-color: #5fb236">“Commerce on the Internet has come to rely almost exclusively on financial institutions serving as trusted third parties to process electronic payments.”</u></span> <span class="citation" data-citation="%7B%22citationItems%22%3A%5B%7B%22uris%22%3A%5B%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%5D%2C%22locator%22%3A%221%22%7D%5D%2C%22properties%22%3A%7B%7D%7D">(<span class="citation-item">Nakamoto, p. 1</span>)</span></p>

<blockquote><span class="highlight" data-annotation="%7B%22attachmentURI%22%3A%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FC6IDLDLW%22%2C%22annotationKey%22%3A%222ESAYRD9%22%2C%22color%22%3A%22%235fb236%22%2C%22pageLabel%22%3A%221%22%2C%22position%22%3A%7B%22pageIndex%22%3A0%2C%22rects%22%3A%5B%5B108.1%2C373.615%2C504.091%2C384.8%5D%2C%5B108.1%2C362.015%2C324.159%2C373.2%5D%5D%7D%2C%22citationItem%22%3A%7B%22uris%22%3A%5B%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%5D%2C%22locator%22%3A%221%22%7D%7D">Commerce on the Internet has come to rely almost exclusively on financial institutions serving as trusted third parties to process electronic payments.</span> <span class="citation" data-citation="%7B%22citationItems%22%3A%5B%7B%22uris%22%3A%5B%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%5D%2C%22locator%22%3A%221%22%7D%5D%2C%22properties%22%3A%7B%7D%7D">(<span class="citation-item">Nakamoto, p. 1</span>)</span></blockquote>
<p><span class="highlight" data-annotation="%7B%22attachmentURI%22%3A%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FC6IDLDLW%22%2C%22annotationKey%22%3A%222ESAYRD9%22%2C%22color%22%3A%22%235fb236%22%2C%22pageLabel%22%3A%221%22%2C%22position%22%3A%7B%22pageIndex%22%3A0%2C%22rects%22%3A%5B%5B108.1%2C373.615%2C504.091%2C384.8%5D%2C%5B108.1%2C362.015%2C324.159%2C373.2%5D%5D%7D%2C%22citationItem%22%3A%7B%22uris%22%3A%5B%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%5D%2C%22locator%22%3A%221%22%7D%7D">“Commerce on the Internet has come to rely almost exclusively on financial institutions serving as trusted third parties to process electronic payments.”</span> <span class="citation" data-citation="%7B%22citationItems%22%3A%5B%7B%22uris%22%3A%5B%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%5D%2C%22locator%22%3A%221%22%7D%5D%2C%22properties%22%3A%7B%7D%7D">(<span class="citation-item">Nakamoto, p. 1</span>)</span></p>

<p><span class="highlight" data-annotation="%7B%22attachmentURI%22%3A%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FC6IDLDLW%22%2C%22pageLabel%22%3A%223%22%2C%22position%22%3A%7B%22pageIndex%22%3A2%2C%22rects%22%3A%5B%5B122.5%2C485.515%2C503.755%2C496.7%5D%2C%5B108.1%2C473.915%2C140.925%2C485.1%5D%5D%7D%2C%22citationItem%22%3A%7B%22uris%22%3A%5B%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%5D%2C%22locator%22%3A%223%22%7D%7D">“The proof-of-work also solves the problem of determining representation in majority decision making.”</span> <span class="citation" data-citation="%7B%22citationItems%22%3A%5B%7B%22uris%22%3A%5B%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%5D%2C%22locator%22%3A%223%22%7D%5D%2C%22properties%22%3A%7B%7D%7D">(<span class="citation-item">Nakamoto, p. 3</span>)</span></p>

<p><img alt="" data-attachment-key="DDAAFF11" data-annotation="%7B%22attachmentURI%22%3A%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FC6IDLDLW%22%2C%22annotationKey%22%3A%22AD4NKL28%22%2C%22color%22%3A%22%23ffd400%22%2C%22pageLabel%22%3A%225%22%2C%22position%22%3A%7B%22pageIndex%22%3A4%2C%22rects%22%3A%5B%5B112.5%2C442.8%2C510.3%2C612%5D%5D%7D%2C%22citationItem%22%3A%7B%22uris%22%3A%5B%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%5D%2C%22locator%22%3A%225%22%7D%7D" width="663" height="282"><br><span class="citation" data-citation="%7B%22citationItems%22%3A%5B%7B%22uris%22%3A%5B%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%5D%2C%22locator%22%3A%225%22%2C%22itemData%22%3A%7B%22id%22%3A%22http%3A%2F%2Fzotero.org%2Fusers%2F4100175%2Fitems%2FU285LCSS%22%2C%22type%22%3A%22article-journal%22%2C%22abstract%22%3A%22A%20purely%20peer-to-peer%20version%20of%20electronic%20cash%20would%20allow%20online%20payments%20to%20be%20sent%20directly%20from%20one%20party%20to%20another%20without%20going%20through%20a%20financial%20institution.%20Digital%20signatures%20provide%20part%20of%20the%20solution%2C%20but%20the%20main%20benefits%20are%20lost%20if%20a%20trusted%20third%20party%20is%20still%20required%20to%20prevent%20double-spending.%20We%20propose%20a%20solution%20to%20the%20double-spending%20problem%20using%20a%20peer-to-peer%20network.%20The%20network%20timestamps%20transactions%20by%20hashing%20them%20into%20an%20ongoing%20chain%20of%20hash-based%20proof-of-work%2C%20forming%20a%20record%20that%20cannot%20be%20changed%20without%20redoing%20the%20proof-of-work.%20The%20longest%20chain%20not%20only%20serves%20as%20proof%20of%20the%20sequence%20of%20events%20witnessed%2C%20but%20proof%20that%20it%20came%20from%20the%20largest%20pool%20of%20CPU%20power.%20As%20long%20as%20a%20majority%20of%20CPU%20power%20is%20controlled%20by%20nodes%20that%20are%20not%20cooperating%20to%20attack%20the%20network%2C%20they'll%20generate%20the%20longest%20chain%20and%20outpace%20attackers.%20The%20network%20itself%20requires%20minimal%20structure.%20Messages%20are%20broadcast%20on%20a%20best%20effort%20basis%2C%20and%20nodes%20can%20leave%20and%20rejoin%20the%20network%20at%20will%2C%20accepting%20the%20longest%20proof-of-work%20chain%20as%20proof%20of%20what%20happened%20while%20they%20were%20gone.%22%2C%22language%22%3A%22en%22%2C%22page%22%3A%229%22%2C%22source%22%3A%22Zotero%22%2C%22title%22%3A%22Bitcoin%3A%20A%20Peer-to-Peer%20Electronic%20Cash%20System%22%2C%22author%22%3A%5B%7B%22family%22%3A%22Nakamoto%22%2C%22given%22%3A%22Satoshi%22%7D%5D%7D%7D%5D%2C%22properties%22%3A%7B%7D%7D">(<span class="citation-item">Nakamoto, p. 5</span>)</span></p>

<p>Invalid background-image 1:</p>
<p style="background-image: url('../img/logo.svg');"></p>
<p>Invalid background-image 2:</p>
<p style="background-image: url('http://asdf/img/logo.svg');"></p>
<p>Valid background-image 3:</p>
<p style="background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==');"></p>


<p>External image:</p>
<p><img src="https://static01.nyt.com/images/2020/07/30/science/30VIRUS-FUTURE3-jump/merlin_174267405_2f8e4d59-b785-4231-aea5-476014cc6306-jumbo.jpg?quality=90&auto=webp"/> </p>

<p>Internal image placeholder (while waiting for the load):</p>
<p><img width="500" height="500" data-attachment-key="DDAAFFXX"/></p>
<p>Dead image</p>
<p><img width="500" height="500"/></p>

<p>Multiple     &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;spaces</p>

<pre dir="rtl">Preformatted/code block - <strong>B</strong><em>I</em><u>U</u><span style="text-decoration: line-through">S</span><sub>2</sub><sup>2</sup><span style="color: #99CC00">T</span><span style="background-color: #99CC00">B</span><a href="g">L</a><code>C</code>
1
2
3
<p><a href="http://">Link</a></p>

</pre>
<blockquote><p style="">Blockquote (supports any node)</p>
<h1>H</h1>
<ol>
<li><p></p></li>
</ol>
<table>
<tr><td><p></p></td><td><p></p></td></tr>
</table>

</blockquote>
<ul>
    <li><p>List (supports any node)
    <ol>
     <li>One</li>
    <li>Two</li>
    <li>Three</li>
    <li><p>Other</p>
        <ol>
            <li><table><tr><td><p></p></td><td><p></p></td></tr><tr><td><p></p></td><td><p></p></td></tr></table></li>
            <li><p><img src="https://static01.nyt.com/images/2020/07/30/science/30VIRUS-FUTURE3-jump/merlin_174267405_2f8e4d59-b785-4231-aea5-476014cc6306-jumbo.jpg?quality=90&auto=webp"/></p></li>
            <li><blockquote></blockquote></li>
        </ol>
    </li>

</ol>
    </p>

</ul>
<table>
<thead>
<tr>
<th>Th 1</th>
<th>Th 2</th>
<th>Th 3</th>
</tr>
</thead>
<tbody>
<tr>
<td><p>External image inside table: <img src="https://static01.nyt.com/images/2020/07/30/science/30VIRUS-FUTURE3-jump/merlin_174267405_2f8e4d59-b785-4231-aea5-476014cc6306-jumbo.jpg?quality=90&auto=webp"/></p></td>
<td><p>List inside table:</p>
<ul>
<li>Element 1</li>
<li>Element 2</li>
<li>Element 3</li>
</ul></td>
<td>
<p>Table inside table</p>
<table>
<tr>
<td style="background-color: green"></td><td></td>
</tr>
<tr>
<td></td><td></td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
<p>Horizontal rule:</p>
<hr/>




<h1>Marks:</h1>
<ol>
<li><p><strong>strong</strong></p></li>
<li><p><em>emphasis</em></p></li>
<li><p><u>underline</u></p></li>
<li><p><s>strike</s></p></li>
<li><p>O<sub>2</sub></p></li>
<li><p>X<sup>2</sup></p></li>
<li><p><code>inline</code> code</p></li>
<li><p><span style="color: #FF0000">text</span> color</p></li>
<li><p><span style="background-color: #99CC00">background</span> color</p></li>
<li><p><a href="#heading-test-1">internal</a> and <a href="https://www.zotero.org">external</a> link</p></li>
</ol>
<p> </p>
<h1>Special cases:</h1>
<p><strong>Indent (for heading and paragraph only):</strong></p>
<p style="padding-left: 40px">indent 1</p>
<p style="padding-left: 80px">indent 2</p>
<p style="padding-left: 120px">indent 3</p>
<p style="padding-left: 160px">indent 4</p>
<p style="padding-left: 200px">indent 5</p>
<p data-indent="100">indent 100</p>
<p style="padding-left: 4000px">indent 100</p>
<p></p>
<p></p>
<p></p>
<p><strong>Alignment (for heading and paragraph only):</strong></p>
<p style="text-align: left;padding-left: 0px"><span style="color: rgb(0, 0, 0)"><span style="background-color: rgb(255, 255, 255)">Align left</span></span></p>
<p style="text-align: center">Align center</p>
<p style="text-align: right">Align right</p>
<p style="text-align: justify"><span style="color: rgb(0, 0, 0)"><span style="background-color: rgb(255, 255, 255)">Align justify: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</span></span></p>
<p></p>
<p></p>
<p></p>
<p><strong>Right-to-left (for heading and paragraph only):</strong></p>
<p dir="rtl">Right</p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<h1 id="heading-test-1">Click the internal link above to navigate here</h1>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<blockquote cite="asdfasdf">Cite attribute</blockquote>
<asdfasdf>
<p style="background-image:  linear-gradient(rgba(0, 0, 255, 0.5), rgba(255, 255, 0, 0.5)), url('https://mdn.mozillademos.org/files/7693/catfront.png');">Background image extracted</p>
<div style="background-image: asdf;">Invalid background color</div>
<p><span style="background: red;">This has a red background</span></p>
</asdfasdf>

  <video width = "500" height = "300" controls>
         <source src = "/html/compileonline.mp4" type = "video/mp4">
         This browser doesn't support video tag.
      </video>

<p>Please press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> to re-render an MDN page.</p>

<p>Paragraph<p> in paragraph</p></p>

<p>&ltq&gt;: When Dave asks HAL to open the pod bay door, HAL answers: <q cite="https://www.imdb.com/title/tt0062622/quotes/qt0396921">I'm sorry, Dave. I'm afraid I can't do that.</q></p>

<dl>
    <dt>Beast of Bodmin</dt>
    <dd>A large feline inhabiting Bodmin Moor.</dd>

    <dt>Morgawr</dt>
    <dd>A sea serpent.</dd>

    <dt>Owlman</dt>
    <dd>A giant owl-like creature.</dd>
</dl>

</div>
`;


main(html1);

// setTimeout(() => {
//
// editorCore.view.dispatch(editorCore.view.state.tr.setSelection(new TextSelection(editorCore.view.state.doc.resolve(editorCore.view.state.doc.content.size))).scrollIntoView());
//
// }, 3000);
