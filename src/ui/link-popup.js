'use strict';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import cx from 'classnames'

function LinkPopup({ linkState, className }) {
  const [popupPosition, setPopupPosition] = useState(null);
  const [update, setUpdate] = useState();
  const containerRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    setUpdate(linkState);
  }, [linkState]);

  useLayoutEffect(() => {
    if (update) {
      updatePopupPosition();
    }
  }, [update]);


  function updatePopupPosition() {
    let dimensions = {
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight
    };

    let isTop = false;
    let top = update.top - dimensions.height;
    let left = update.left;

    setPopupPosition({ top, left, isTop });

    inputRef.current.value = linkState.href || '';

    if (linkState.isActive && linkState.href === null) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 0)

    }
  }

  let topBottom = {};
  if (popupPosition) {
    topBottom['page-popup-' + (popupPosition.isTop ? 'top' : 'bottom')] = true;
  }

  function handleSet() {
    linkState.setUrl(inputRef.current.value);
  }

  function handleUnset() {
    linkState.removeUrl();
  }

  function handleOpen() {
    console.log('open', linkState.href);
  }

  function handleKeydown(event) {
    if (event.which == 13 || event.keyCode == 13) {
      linkState.setUrl(inputRef.current.value);
    }
  }

  return (
    <div
      ref={containerRef}
      className={cx('page-popup', className, { ...topBottom })}
      style={popupPosition && { ...popupPosition }}
    >
      <input id="link-bubble-input" ref={inputRef} type="edit" placeholder="Enter URL" onKeyDown={handleKeydown}/>
      {linkState.href && <button id="link-bubble-remove" onClick={handleUnset}>Unlink</button>}
      {linkState.href && <button id="link-bubble-open" onClick={handleOpen}>Open</button>}
      <button id="link-bubble-set" onClick={handleSet}>Set</button>
    </div>
  );
}

export default LinkPopup;
