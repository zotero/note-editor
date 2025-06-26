'use strict';

import React from 'react';
import { useLocalization } from '@fluent/react';

import Popup from './popup';

import IconBlockquote from '../../../res/icons/16/cite.svg';
import IconDocument from '../../../res/icons/16/page.svg';
import IconUnlink from '../../../res/icons/16/unlink.svg';

function ImagePopup({ parentRef, imageState, citationState }) {
	const { l10n } = useLocalization();

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
				<div className="title">{l10n.getString('note-editor-go-to-page')}</div>
			</button>
			<button onClick={handleUnlink}>
				<div className="icon"><IconUnlink/></div>
				<div className="title">{l10n.getString('note-editor-unlink')}</div>
			</button>
			{citationState.canAddCitationAfter() && <button onClick={handleAdd}>
				<div className="icon"><IconBlockquote/></div>
				<div className="title">{l10n.getString('note-editor-add-citation')}</div>
			</button>}
		</Popup>
	);
}

export default ImagePopup;
