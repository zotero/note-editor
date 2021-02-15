'use strict';

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, Fragment } from 'react';
import cx from 'classnames'

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
		let top = parentScrollTop + (pluginState.rect.top - popupRef.current.offsetHeight - parentTop - 8);
		let left = pluginState.rect.left;
		let isAbove = true;
		if (top < 0) {
			top = parentScrollTop + (pluginState.rect.bottom - parentTop);
			isAbove = false;
		}

		let width = popupRef.current.offsetWidth;


		left = pluginState.rect.left + (pluginState.rect.right - pluginState.rect.left) / 2 - width / 2;

		if (left + width > maxWidth) {
			left = maxWidth - width;
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

	function handleEdit() {
		pluginState.edit();
	}

	return useMemo(() => {
		if (!pluginState.isActive) return null;

		return (
			<div ref={containerRef}>
				<div
					ref={popupRef}
					className={cx('citation-popup page-popup page-popup-top')}
				>
					<div className="button toolbarButton" onClick={handleEdit}>Edit</div>
					<div className="button toolbarButton" onClick={handleOpen}>Open</div>
				</div>
			</div>
		);
	}, [pluginState]);
}

export default CitationPopup;
