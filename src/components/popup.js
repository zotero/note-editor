'use strict';

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import cx from 'classnames'

function Popup({ position, className, children }) {
  const [popupPosition, setPopupPosition] = useState(null);
  const [update, setUpdate] = useState();
  const containerRef = useRef();

  useEffect(() => {
    setUpdate({});
  }, [position]);

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
    let top = 10;
    let left = 10;

    setPopupPosition({ top, left, isTop });
  }

  let topBottom = {};
  if (popupPosition) {
    topBottom['page-popup-' + (popupPosition.isTop ? 'top' : 'bottom')] = true;
  }


  return (
    <div
      ref={containerRef}
      className={cx('page-popup', className, { ...topBottom })}
      style={popupPosition && { ...popupPosition }}
    >
      {children}
    </div>
  );
}

export default Popup;
