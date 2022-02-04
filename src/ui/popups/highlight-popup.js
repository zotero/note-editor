'use strict';

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { IconBlockquote, IconDocument, IconUnlink } from '../icons';
import Popup from './popup';

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
				<FormattedMessage id="noteEditor.showOnPage"/>
			</button>
			<button onClick={handleUnlink}>
				<div className="icon"><IconUnlink/></div>
				<FormattedMessage id="noteEditor.unlink"/>
			</button>
			{citationState.canAddCitationAfter() && <button onClick={handleAdd}>
				<div className="icon"><IconBlockquote/></div>
				<FormattedMessage id="noteEditor.addCitation"/>
			</button>}
		</Popup>
	);
}

export default HighlightPopup;
