'use strict';

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { IconBlockquote, IconDocument, IconUndo } from '../icons';
import Popup from './popup';

function CitationPopup({ parentRef, pluginState, viewMode }) {
	function handleOpen() {
		pluginState.open();
	}

	function handleShowItem() {
		pluginState.showItem();
	}

	function handleEdit() {
		pluginState.edit();
	}

	return (
		<Popup className="citation-popup" parentRef={parentRef} pluginState={pluginState}>
			{pluginState.canOpen && <button onClick={handleOpen}>
				<div className="icon"><IconDocument/></div>
				<FormattedMessage id="noteEditor.goToPage"/>
			</button>}
			<button onClick={handleShowItem}>
				<div className="icon"><IconUndo/></div>
				<FormattedMessage id="noteEditor.showItem"/>
			</button>
			{viewMode !== 'ios' && <button onClick={handleEdit}>
				<div className="icon"><IconBlockquote/></div>
				<FormattedMessage id="noteEditor.editCitation"/>
			</button>}
		</Popup>
	)
}

export default CitationPopup;
