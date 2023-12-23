'use strict';

import React from 'react';
import { FormattedMessage } from 'react-intl';

import Popup from './popup';

import IconBlockquote from '../../../res/icons/16/cite.svg';
import IconDocument from '../../../res/icons/16/page.svg';
import IconUnlink from '../../../res/icons/16/unlink.svg';

function HighlightPopup({ parentRef, highlightState, citationState }) {
	function handleOpen() {
		highlightState.popup.open();
	}

	function handleUnlink() {
		highlightState.popup.unlink();
	}

	function handleAdd() {
		citationState.addCitationAfter();
	}

	return (
		<Popup className="highlight-popup" parentRef={parentRef} pluginState={highlightState.popup}>
			<button onClick={handleOpen}>
				<div className="icon"><IconDocument/></div>
				<div className="title"><FormattedMessage id="noteEditor.showOnPage"/></div>
			</button>
			<button onClick={handleUnlink}>
				<div className="icon"><IconUnlink/></div>
				<div className="title"><FormattedMessage id="noteEditor.unlink"/></div>
			</button>
			{citationState.canAddCitationAfter() && <button onClick={handleAdd}>
				<div className="icon"><IconBlockquote/></div>
				<div className="title"><FormattedMessage id="noteEditor.addCitation"/></div>
			</button>}
		</Popup>
	);
}

export default HighlightPopup;
