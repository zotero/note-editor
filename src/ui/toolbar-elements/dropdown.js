'use strict';

import cx from 'classnames';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './button';

export default function Dropdown({ className, icon, title, children }) {
	const [show, setShow] = useState(false);
	const rootRef = useRef();

	const handleMouseDownCallback = useCallback(handleMouseDown, []);
	const handleKeyDownCallback = useCallback(handleKeyDown, []);

	useEffect(() => {
		window.addEventListener('mousedown', handleMouseDownCallback);
		window.addEventListener('keydown', handleKeyDownCallback);
		return () => {
			window.removeEventListener('mousedown', handleMouseDownCallback);
			window.removeEventListener('keydown', handleKeyDownCallback);
		};
	}, [handleMouseDownCallback]);

	function handleMouseDown(event) {
		let parent = event.target;
		while (parent && parent !== rootRef.current) parent = parent.parentNode;
		if (!parent) {
			setShow(false);
		}
	}

	function handleKeyDown(event) {
		if (event.key === 'Escape') {
			setShow(false);
		}
	}

	function handleButtonDown(event) {
		setShow(!show);
	}

	function handlePopupClick() {
		setShow(false);
	}

	return (
		<div ref={rootRef} className={cx('dropdown', className)}>
			<Button icon={icon} title={title} active={show} triggerOnMouseDown={true} onClick={handleButtonDown}/>
			{show && <div className="popup" onClick={handlePopupClick}>
				{children}
			</div>}
		</div>
	);
}
