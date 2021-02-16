import cx from 'classnames';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const blockTypes = [
	['paragraph', 'Paragraph', 'Paragraph'],
	['heading1', 'Heading 1', <h1>Heading 1</h1>],
	['heading2', 'Heading 2', <h2>Heading 2</h2>],
	['heading3', 'Heading 3', <h3>Heading 3</h3>],
	['heading4', 'Heading 4', <h4>Heading 4</h4>],
	['heading5', 'Heading 5', <h5>Heading 5</h5>],
	['heading6', 'Heading 6', <h6>Heading 6</h6>],
	['code', 'Preformatted', <code>Preformatted</code>]
];

const POPUP_WIDTH = 154;

export default function Dropdown({ blocks }) {
	const [isShowingList, setIsShowingList] = useState(false);
	const [popupPosition, setPopupPosition] = useState(null);
	const rootRef = useRef();

	const handleMouseDownCallback = useCallback(handleWindowMousedown, [blocks]);

	useEffect(() => {
		window.addEventListener('mousedown', handleMouseDownCallback);
		return () => {
			window.removeEventListener('mousedown', handleMouseDownCallback);
		};
	}, [handleMouseDownCallback]);

	function handleWindowMousedown(event) {
		let parent = event.target;
		while (parent && parent !== rootRef.current) parent = parent.parentNode;
		if (!parent) {
			setPopupPosition(null);
		}
	}

	function openPopup() {
		if (rootRef.current) {
			let rect = rootRef.current.getBoundingClientRect();
			let left = rect.left;
			let top = rect.top + rootRef.current.offsetHeight;
			setPopupPosition({
				left,
				top
			});
		}
	}

	function handleValueClick(event) {
		openPopup();
	}

	function handleItemPick(type) {
		setPopupPosition(null);
		blocks[type].run();
	}

	function getActiveBlockName() {
		return (blockTypes.find(([type]) => blocks[type].isActive) || blockTypes[0])[1];
	}

	return (
		<div ref={rootRef} className={cx('dropdown', { active: !!popupPosition })}>
			<div className="face" onClick={handleValueClick}>
				<div className="value">{getActiveBlockName()}</div>
				<div className="down-button">
					<div className="mce-caret"/>
				</div>
			</div>
			{popupPosition && <div className="popup" style={{ ...popupPosition }}>
				{blockTypes.map(([type, name, element], index) => (
					<div key={index} className={cx('dropdown-item', { active: blocks[type].isActive })}
					     onClick={() => handleItemPick(type)}>{element}</div>
				))}
			</div>}
		</div>
	);
}
