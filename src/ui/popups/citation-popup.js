import React from 'react';
import { useLocalization } from '@fluent/react';
import Popup from './popup';
import IconBlockquote from '../../../res/icons/16/cite.svg';
import IconHide from '../../../res/icons/16/hide.svg';
import IconDocument from '../../../res/icons/16/page.svg';
import IconUndo from '../../../res/icons/16/show-item.svg';

function CitationPopup({ parentRef, citationState, viewMode }) {
	let { l10n } = useLocalization();

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
				<div className="title">{l10n.getString('note-editor-go-to-page')}</div>
			</button>}
			<button onClick={handleShowItem}>
				<div className="icon"><IconUndo/></div>
				<div className="title">{l10n.getString('note-editor-show-item')}</div>
			</button>
			{!['ios', 'web'].includes(viewMode) && <button onClick={handleEdit}>
				<div className="icon"><IconBlockquote/></div>
				<div className="title">{l10n.getString('note-editor-edit-citation')}</div>
			</button>}
			{citationState.popup.canRemove && <button onClick={handleRemove}>
				<div className="icon"><IconHide/></div>
				<div className="title">{l10n.getString('note-editor-remove-citation')}</div>
			</button>}
		</Popup>
	)
}

export default CitationPopup;
