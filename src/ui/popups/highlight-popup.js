'use strict';

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { IconBlockquote, IconDocument, IconUnlink } from '../icons';
import Popup from './popup';

function HighlightPopup({ parentRef, pluginState }) {
	function handleOpen() {
		pluginState.open();
	}

	function handleUnlink() {
		pluginState.unlink();
	}

	function handleAdd(event) {
		pluginState.addCitation();
	}

	return (
		<Popup className="highlight-popup" parentRef={parentRef} pluginState={pluginState}>
			<button onClick={handleOpen}>
				<div className="icon"><IconDocument/></div>
				<FormattedMessage id="noteEditor.showOnPage"/>
			</button>
			<button onClick={handleUnlink}>
				<div className="icon"><IconUnlink/></div>
				<FormattedMessage id="noteEditor.unlink"/>
			</button>
			{pluginState.canAddCitation && <button onClick={handleAdd}>
				<div className="icon"><IconBlockquote/></div>
				<FormattedMessage id="noteEditor.addCitation"/>
			</button>}
		</Popup>
	);
}

export default HighlightPopup;
