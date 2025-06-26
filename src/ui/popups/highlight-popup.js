import React from 'react';
import { useLocalization } from '@fluent/react';
import Popup from './popup';
import IconBlockquote from '../../../res/icons/16/cite.svg';
import IconDocument from '../../../res/icons/16/page.svg';
import IconUnlink from '../../../res/icons/16/unlink.svg';

function HighlightPopup({ parentRef, highlightState, citationState, viewMode }) {
	let { l10n } = useLocalization();

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
				<div className="title">{l10n.getString('note-editor-go-to-page')}</div>
			</button>
			{!['web'].includes(viewMode) && (
				<button onClick={handleUnlink}>
					<div className="icon"><IconUnlink/></div>
					<div className="title">{l10n.getString('note-editor-unlink')}</div>
				</button>
			)}
			{citationState.canAddCitationAfter() && <button onClick={handleAdd}>
				<div className="icon"><IconBlockquote/></div>
				<div className="title">{l10n.getString('note-editor-add-citation')}</div>
			</button>}
		</Popup>
	);
}

export default HighlightPopup;
