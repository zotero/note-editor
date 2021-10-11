'use strict';

import React, { useLayoutEffect, useRef, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import cx from 'classnames';
import { IconBlockquote, IconDocument, IconUnlink } from './icons';

// TODO: Consolidate all popups into single component

function ImagePopup({ parentRef, pluginState }) {
	const containerRef = useRef();
	const popupRef = useRef();
	const inputRef = useRef();

	useLayoutEffect(() => {
		if (!pluginState.active) {
			return;
		}

		let parentScrollTop = parentRef.current.scrollTop;
		let parentTop = parentRef.current.getBoundingClientRect().top;
		let maxWidth = containerRef.current.offsetWidth;
		let top = parentScrollTop + (pluginState.rect.top - popupRef.current.offsetHeight - parentTop - 10);
		if (top < 0) {
			top = parentScrollTop + (pluginState.rect.bottom - parentTop) + 10;
			popupRef.current.classList.remove('page-popup-top');
			popupRef.current.classList.add('page-popup-bottom');
		}
		else {
			popupRef.current.classList.remove('page-popup-bottom');
			popupRef.current.classList.add('page-popup-top');
		}

		let width = popupRef.current.offsetWidth;

		let left = pluginState.rect.left + (pluginState.rect.right - pluginState.rect.left) / 2 - width / 2;

		if (left + width > maxWidth) {
			left = maxWidth - width;
		}

		if (left < 0) {
			left = 0;
		}

		popupRef.current.style.top = Math.round(top) + 'px';
		popupRef.current.style.left = Math.round(left) + 'px';

		if (inputRef.current) {
			inputRef.current.value = pluginState.href || '';
		}
	}, [pluginState]);

	function handleOpen() {
		pluginState.open();
	}

	function handleUnlink() {
		pluginState.unlink();
	}

	function handleAdd(event) {
		pluginState.addCitation();
	}

	return useMemo(() => {
		if (!pluginState.active) return null;

		return (
			<div ref={containerRef}>
				<div ref={popupRef} className={cx('image-popup page-popup page-popup-top')}>
					<div className="button toolbarButton" onClick={handleOpen}>
						<div className="icon"><IconDocument/></div>
					  <FormattedMessage id="noteEditor.showOnPage"/>
					</div>
					<div className="button toolbarButton" onClick={handleUnlink}>
						<div className="icon"><IconUnlink/></div>
						<FormattedMessage id="noteEditor.unlink"/>
					</div>
					{pluginState.canAddCitation && <div className="button toolbarButton" onClick={handleAdd}>
						<div className="icon"><IconBlockquote/></div>
						<FormattedMessage id="noteEditor.addCitation"/>
					</div>}
				</div>
			</div>
		);
	}, [pluginState]);
}

export default ImagePopup;
