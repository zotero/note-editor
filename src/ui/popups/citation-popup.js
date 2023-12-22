'use strict';

import React from 'react';
import { FormattedMessage } from 'react-intl';

import Popup from './popup';

import IconBlockquote from '../../../res/icons/16/cite.svg';
import IconCloseSmall from '../../../res/icons/16/x-8.svg';
import IconDocument from '../../../res/icons/16/show-item.svg';
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
				<FormattedMessage id="noteEditor.goToPage"/>
			</button>}
			<button onClick={handleShowItem}>
				<div className="icon"><IconUndo/></div>
				<FormattedMessage id="noteEditor.showItem"/>
			</button>
			{!['ios', 'web'].includes(viewMode) && <button onClick={handleEdit}>
				<div className="icon"><IconBlockquote/></div>
				<FormattedMessage id="noteEditor.editCitation"/>
			</button>}
			{citationState.popup.canRemove && <button onClick={handleRemove}>
				<div className="icon"><IconCloseSmall/></div>
				<FormattedMessage id="noteEditor.removeCitation"/>
			</button>}
		</Popup>
	)
}

export default CitationPopup;
