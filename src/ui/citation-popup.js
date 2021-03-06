'use strict';

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, Fragment } from 'react';
import cx from 'classnames';

// TODO: Rewrite all popups and reuse the common logic

function CitationPopup({ parentRef, pluginState }) {
	const containerRef = useRef();
	const popupRef = useRef();
	const inputRef = useRef();

	useLayoutEffect(() => {
		if (!pluginState.isActive) {
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

	function handleShowItem() {
		pluginState.showItem();
	}

	function handleEdit() {
		pluginState.edit();
	}

	return useMemo(() => {
		if (!pluginState.isActive) return null;

		return (
			<div ref={containerRef}>
				<div
					ref={popupRef}
					className={cx('citation-popup page-popup')}
				>
					{pluginState.enableOpen && <div className="button toolbarButton" onClick={handleOpen}><div className="mce-ico mce-i-newdocument"/> Go to Page</div>}
					<div className="button toolbarButton" onClick={handleShowItem}><div className="mce-ico mce-i-undo"/> Show Item</div>
					<div className="button toolbarButton" onClick={handleEdit}><div className="mce-ico mce-i-blockquote"/> Edit Citation</div>
				</div>
			</div>
		);
	}, [pluginState]);
}

export default CitationPopup;
