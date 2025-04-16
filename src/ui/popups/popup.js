'use strict';

import React, { useLayoutEffect, useRef } from 'react';
import cx from 'classnames';


function Popup({ parentRef, pluginState, className, children }) {
	const containerRef = useRef();
	const popupRef = useRef();

	useLayoutEffect(() => {
		if (!pluginState.active) {
			return;
		}

		let rect = pluginState.rect || pluginState.node.getBoundingClientRect();

		let parentScrollTop = parentRef.current.scrollTop;
		let parentTop = parentRef.current.getBoundingClientRect().top;
		let maxWidth = containerRef.current.offsetWidth;
		let top = parentScrollTop + (rect.top - popupRef.current.offsetHeight - parentTop - 10);

		if (top < 0) {
			top = parentScrollTop + (rect.bottom - parentTop) + 10;
			popupRef.current.classList.remove('popup-top');
			popupRef.current.classList.add('popup-bottom');
		}
		else {
			popupRef.current.classList.remove('popup-bottom');
			popupRef.current.classList.add('popup-top');
		}

		let width = popupRef.current.offsetWidth;
		let left = rect.left + (rect.right - rect.left) / 2 - width / 2 + 1;

		if (left + width >= maxWidth) {
			left = maxWidth - width;
		}

		if (left < 2) {
			left = 2;
		}

		popupRef.current.style.top = Math.round(top) + 'px';
		popupRef.current.style.left = Math.round(left) + 'px';
	}, [pluginState]);

	function handleKeydown(event) {
		if (event.key === 'Escape') {
			if (pluginState.refocusView) {
				pluginState.refocusView();
				event.preventDefault();
				event.stopPropagation();
			}

		}
	}


	if (!pluginState.active) return null;

	return (
		<div ref={containerRef} className="popup-container" onKeyDown={handleKeydown}>
			<div ref={popupRef} className={cx('popup popup-top', className)}>
				{children}
			</div>
		</div>
	);

}

export default Popup;
