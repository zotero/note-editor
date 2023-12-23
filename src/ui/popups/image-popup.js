'use strict';

import React from 'react';
import { FormattedMessage } from 'react-intl';

import Popup from './popup';

import IconBlockquote from '../../../res/icons/16/cite.svg';
import IconDocument from '../../../res/icons/16/page.svg';
import IconUnlink from '../../../res/icons/16/unlink.svg';

function ImagePopup({ parentRef, imageState, citationState }) {
	function handleOpen() {
		imageState.popup.open();
	}

	function handleUnlink() {
		imageState.popup.unlink();
	}

	function handleAdd() {
		citationState.addCitationAfter();
	}

	return (
		<Popup className="image-popup" parentRef={parentRef} pluginState={imageState.popup}>
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

export default ImagePopup;
