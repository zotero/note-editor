'use strict';

import cx from 'classnames';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from './button';
import { mod, usePrevious } from '../../core/utils';

export default function Dropdown({ className, icon, title, children }) {
	const [show, setShow] = useState(false);
	const prevShow = usePrevious(show);
	const rootRef = useRef();
	const popupRef = useRef(null);
	const buttonRef = useRef(null);
	const lastFocusedIndex = useRef(0);

	const handleMouseDownCallback = useCallback(handleGlobalMouseDown, []);
	const handleKeyDownCallback = useCallback(handleGlobalKeyDown, []);
	const handleBlurCallback = useCallback(handleBlur, []);

	useEffect(() => {
		window.addEventListener('mousedown', handleMouseDownCallback);
		window.addEventListener('keydown', handleKeyDownCallback);
		window.addEventListener('blur', handleBlurCallback);
		return () => {
			window.removeEventListener('mousedown', handleMouseDownCallback);
			window.removeEventListener('keydown', handleKeyDownCallback);
			window.removeEventListener('blur', handleBlurCallback);
		};
	}, [handleMouseDownCallback]);

	const getCandidateNodes = useCallback(() =>
		Array.from(popupRef.current?.querySelectorAll('button:not([disabled])') ?? []),
	[]);

	useEffect(() => {
		if (show && !prevShow) {
			const candidates = getCandidateNodes();
			candidates.forEach(n => node => node.tabIndex = "-1");
			const nextNode = popupRef.current.querySelector('button.active:not([disabled])')
				?? popupRef.current.querySelector('button:not([disabled])');

			if(nextNode) {
				lastFocusedIndex.current = candidates.indexOf(nextNode);
				nextNode.focus();
			}
		}
	}, [show, prevShow]);

	useLayoutEffect(() => {
		if (show) {
			positionPopup();
		}
	});

	function positionPopup() {
		let PADDING = 5;
		let editorWidth = document.getElementById('editor-container').offsetWidth;
		let buttonRect = buttonRef.current.getBoundingClientRect();
		let buttonLeft = buttonRect.left;
		let buttonWidth = buttonRect.width;
		let popupWidth = popupRef.current.offsetWidth;
		let delta = -(popupWidth / 2 - buttonWidth / 2);
		let absoluteLeft = buttonLeft + delta;
		let absoluteRight = absoluteLeft + popupWidth;
		if (absoluteLeft < PADDING) {
			delta += PADDING - absoluteLeft;
		}
		else if (absoluteRight > editorWidth - PADDING) {
			delta += editorWidth - PADDING - absoluteRight;
		}
		popupRef.current.style.left = delta + 'px';
	}

	function handleGlobalMouseDown(event) {
		let parent = event.target;
		while (parent && parent !== rootRef.current) parent = parent.parentNode;
		if (!parent) {
			// put focus back on the dropdown button, then move focus again as expected. This now
			// triggers blur-related cleanup in toolbar prior to the destruction of a popup
			buttonRef.current.focus();
			event.target.focus();
			setShow(false);
		}
	}

	function handleGlobalKeyDown(event) {
		if (event.key === 'Escape') {
			setShow(false);
			buttonRef.current.focus();
		}
	}

	function handleBlur(event) {
		setShow(false);
	}

	function handleButtonDown(event) {
		setShow(!show);
	}

	function handlePopupClick() {
		setShow(false);
	}

	const handleKeyDown = useCallback((ev) => {
		const candidates = getCandidateNodes();
		if (!candidates.length) {
			return;
		}

		if (ev.key === 'ArrowUp' && lastFocusedIndex.current === 0) {
			setShow(false);
			buttonRef.current.focus();
			ev.stopPropagation();
			return;
		}
		else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') {
			lastFocusedIndex.current = mod((lastFocusedIndex.current - 1), candidates.length);
		}
		else if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') {
			lastFocusedIndex.current = mod((lastFocusedIndex.current + 1), candidates.length);
		}
		if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) {
			candidates?.[lastFocusedIndex.current].focus();
			ev.stopPropagation();
		}
	}, [show, getCandidateNodes]);

	const handleButtonKeyDown = useCallback((ev) => {
		if (ev.key === 'ArrowDown' && !show) {
			setShow(true);
		}
	}, [show]);

	return (
		<div ref={rootRef} className={cx('dropdown', className)} onKeyDown={handleKeyDown}>
			<Button
				ref={buttonRef}
				icon={icon}
				title={title}
				active={show}
				triggerOnMouseDown={true}
				onClick={handleButtonDown}
				onKeyDown={handleButtonKeyDown}
				aria-haspopup="true"
				aria-expanded={show ? 'true' : 'false'}
			/>
			{show && <div ref={popupRef} role="menu" className="popup" onClick={handlePopupClick}>
				{children}
			</div>}
		</div>
	);
}
