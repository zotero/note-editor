'use strict';

import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';


function A11yAlert({ linkPopupActive, citationPopupActive }) {
	const intl = useIntl();
	const [a11yMessage, setA11yMessage] = useState('');

	// announce a11y message for screen readers when relevant popups appear
	useEffect(() => {
		let updateA11yMessage = async () => {
			let msg = "";
			let popupType = null;
			
			if (linkPopupActive) {
				popupType = 'link';
			}
			else if (citationPopupActive) {
				popupType = 'citation';
			}
			
			// fetch the message via fluent if available or from strings.js otherwise
			if (popupType) {
				if (document.l10n) {
					msg = await document.l10n.formatValue(`note-editor-${popupType}-popup-appeared`);
				}
				else {
					msg = intl.formatMessage({ id: `noteEditor.${popupType}PopupAppeared` });
				}
			}

			setA11yMessage(msg);
		};
		updateA11yMessage();
	}, [linkPopupActive, citationPopupActive]);

	return (
		<div id="a11y-alert" aria-live="polite">{a11yMessage}</div>
	);
}

export default A11yAlert;
