'use strict';

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, Fragment } from 'react';
import cx from 'classnames';

function LinkPopup({ parentRef, linkState }) {
	const [editing, setEditing] = useState(false);
	const containerRef = useRef();
	const popupRef = useRef();
	const inputRef = useRef();

	useEffect(() => {
		setEditing(!linkState.href);
	}, [linkState]);


	useLayoutEffect(() => {
		if (!linkState.isActive) {
			return;
		}

		let parentScrollTop = parentRef.current.scrollTop;
		let parentTop = parentRef.current.getBoundingClientRect().top;
		let maxWidth = containerRef.current.offsetWidth;
		let top = parentScrollTop + (linkState.top - popupRef.current.offsetHeight - parentTop - 10);
		let left = linkState.left;
		let isAbove = true;
		if (top < 0) {
			top = parentScrollTop + (linkState.bottom - parentTop) + 10;
			popupRef.current.classList.remove('page-popup-top');
			popupRef.current.classList.add('page-popup-bottom');
		}
		else {
			popupRef.current.classList.remove('page-popup-bottom');
			popupRef.current.classList.add('page-popup-top');
		}

		let width = popupRef.current.offsetWidth;
		if (left + width > maxWidth) {
			left = maxWidth - width;
		}

		if (left < 0) {
			left = 0;
		}

		popupRef.current.style.top = Math.round(top) + 'px';
		popupRef.current.style.left = Math.round(left) + 'px';

		if (inputRef.current) {
			inputRef.current.value = linkState.href || '';
		}

		if (editing) {
			setTimeout(() => {
				if (inputRef.current) {
					inputRef.current.focus();
				}
			}, 0);
		}
	}, [editing, linkState]);

	function handleSet() {
		linkState.setURL(inputRef.current.value);
	}

	function handleUnset() {
		linkState.removeURL();
	}

	function handleOpen(event) {
		event.preventDefault();
		linkState.open();
	}

	function handleEdit() {
		setEditing(true);
	}

	function handleKeydown(event) {
		if (event.key === 'Enter') {
			linkState.setURL(inputRef.current.value);
		}
		else if (event.key === 'Escape') {
			setEditing(false);
		}
	}

	return useMemo(() => {
		if (!linkState.isActive) return null;

		return (
			<div ref={containerRef}>
				<div
					ref={popupRef}
					className={cx('link-popup page-popup page-popup-top')}
				>
					{editing
						? (
							<Fragment>
								<div className="link"><input ref={inputRef} type="edit" placeholder="Enter URL"
							                             onKeyDown={handleKeydown}/>
								</div>
								<div className="button toolbarButton" onClick={handleSet}>Set</div>
							</Fragment>
						)
						: (
							<Fragment>
								<div className="link"><a href={linkState.href} onClick={handleOpen}>{linkState.href}</a></div>
								<div className="button toolbarButton" onClick={handleEdit}>Edit</div>
								<div className="button toolbarButton" onClick={handleUnset}>Unlink</div>
							</Fragment>
						)}
				</div>
			</div>
		);
	}, [editing, linkState]);
}

export default LinkPopup;
