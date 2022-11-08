'use strict';

import cx from 'classnames';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { mod, usePrevious } from '../../core/utils';

export default function Dropdown({ className, icon, title, children }) {
	const [show, setShow] = useState(false);
	const prevShow = usePrevious(show);
	const rootRef = useRef();
	const childWrapRef = useRef(null);
	const buttonRef = useRef(null);
	const lastFocusedIndex = useRef(0);

	const handleMouseDownCallback = useCallback(handleGlobalMouseDown, []);
	const handleKeyDownCallback = useCallback(handleGlobalKeyDown, []);

	useEffect(() => {
		window.addEventListener('mousedown', handleMouseDownCallback);
		window.addEventListener('keydown', handleKeyDownCallback);
		return () => {
			window.removeEventListener('mousedown', handleMouseDownCallback);
			window.removeEventListener('keydown', handleKeyDownCallback);
		};
	}, [handleMouseDownCallback]);

	const getCandidateNodes = useCallback(() =>
		Array.from(childWrapRef.current?.querySelectorAll('button:not([disabled])') ?? []),
	[]);

	useEffect(() => {
		if (show && !prevShow) {
			const candidates = getCandidateNodes();
			candidates.forEach(n => node => node.tabIndex = "-1");
			const nextNode = childWrapRef.current.querySelector('button.active:not([disabled])')
				?? childWrapRef.current.querySelector('button:not([disabled])');

			if(nextNode) {
				lastFocusedIndex.current = candidates.indexOf(nextNode);
				nextNode.focus();
			}
		}
	}, [show, prevShow]);

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
			/>
			{show && <div ref={childWrapRef} className="popup" onClick={handlePopupClick}>
				{children}
			</div>}
		</div>
	);
}
