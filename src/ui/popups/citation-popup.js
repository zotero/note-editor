'use strict';

import React from 'react';
import { FormattedMessage } from 'react-intl';

import Popup from './popup';

import IconBlockquote from '../../../res/icons/16/cite.svg';
import IconCloseSmall from '../../../res/icons/16/x-8.svg';
import IconDocument from '../../../res/icons/16/page.svg';
import IconUndo from '../../../res/icons/16/show-item.svg';

function CitationPopup({ parentRef, citationState, viewMode }) {
	function handleOpen() {
		citationState.popup.open();
	}

	function handleShowItem() {
		citationState.popup.showItem();
	}

	function handleEdit() {
		citationState.popup.edit();
	}

	function handleRemove() {
		citationState.popup.remove();
	}

	return (
		<Popup className="citation-popup" parentRef={parentRef} pluginState={citationState.popup}>
			{citationState.popup.canOpen && <button onClick={handleOpen}>
				<div className="icon"><IconDocument/></div>
				<div className="title"><FormattedMessage id="noteEditor.goToPage"/></div>
			</button>}
			<button onClick={handleShowItem}>
				<div className="icon"><IconUndo/></div>
				<div className="title"><FormattedMessage id="noteEditor.showItem"/></div>
			</button>
			{!['ios', 'web'].includes(viewMode) && <button onClick={handleEdit}>
				<div className="icon"><IconBlockquote/></div>
				<div className="title"><FormattedMessage id="noteEditor.editCitation"/></div>
			</button>}
			{citationState.popup.canRemove && <button onClick={handleRemove}>
				<div className="icon"><IconCloseSmall/></div>
				<div className="title"><FormattedMessage id="noteEditor.removeCitation"/></div>
			</button>}
		</Popup>
	)
}

export default CitationPopup;
