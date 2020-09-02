'use strict';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import cx from 'classnames';

const POPUP_WIDTH = 150;

const DEFAULT_COLOR_INDEX = 0;

const COLORS = [
  ['#000000', 'Black'],
  ['#993300', 'Burnt orange'],
  ['#333300', 'Dark olive'],
  ['#003300', 'Dark green'],
  ['#003366', 'Dark azure'],
  ['#000080', 'Navy Blue'],
  ['#333399', 'Indigo'],
  ['#333333', 'Very dark gray'],
  ['#800000', 'Maroon'],
  ['#FF6600', 'Orange'],
  ['#808000', 'Olive'],
  ['#008000', 'Green'],
  ['#008080', 'Teal'],
  ['#0000FF', 'Blue'],
  ['#666699', 'Grayish blue'],
  ['#808080', 'Gray'],
  ['#FF0000', 'Red'],
  ['#FF9900', 'Amber'],
  ['#99CC00', 'Yellow green'],
  ['#339966', 'Sea green'],
  ['#33CCCC', 'Turquoise'],
  ['#3366FF', 'Royal blue'],
  ['#800080', 'Purple'],
  ['#999999', 'Medium gray'],
  ['#FF00FF', 'Magenta'],
  ['#FFCC00', 'Gold'],
  ['#FFFF00', 'Yellow'],
  ['#00FF00', 'Lime'],
  ['#00FFFF', 'Aqua'],
  ['#00CCFF', 'Sky blue'],
  ['#993366', 'Red violet'],
  ['#FFFFFF', 'White'],
  ['#FF99CC', 'Pink'],
  ['#FFCC99', 'Peach'],
  ['#FFFF99', 'Light yellow'],
  ['#CCFFCC', 'Pale green'],
  ['#CCFFFF', 'Pale cyan'],
  ['#99CCFF', 'Light sky blue'],
  ['#CC99FF', 'Plum']
];

export default function ColorPicker(props) {
  const [color, setColor] = useState(COLORS[DEFAULT_COLOR_INDEX]);
  const [popupPosition, setPopupPosition] = useState(null);
  const rootRef = useRef();

  const handleMouseDownCallback = useCallback(handleWindowMousedown, [props.state]);

  useEffect(() => {
    window.addEventListener('mousedown', handleMouseDownCallback);
    return () => {
      window.removeEventListener('mousedown', handleMouseDownCallback);
    }
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
      let left = rect.left - (POPUP_WIDTH - rootRef.current.offsetWidth) / 2;
      let top = rect.top + rootRef.current.offsetHeight;
      if (left < 0) {
        left = 0;
      }
      setPopupPosition({
        left,
        top
      })
    }
  }

  function handleColorButtonClick() {
    props.state.run(color[0]);
  }

  function handleDownButtonClick(event) {
    openPopup();
    props.state.run(color);
    event.preventDefault();
  }

  function handleColorPick(color) {
    // setIsShowingPopup(false);
    setColor(color);
    props.state.run(color[0]);
    setPopupPosition(null);
  }

  function handleColorClear() {
    // setIsShowingPopup(false);
    props.state.run(null);
    setColor(COLORS[DEFAULT_COLOR_INDEX]);
    setPopupPosition(null);
  }

  return (
    <div ref={rootRef} className={cx('color-picker', { 'background': props.isBackground })}>
      <div className="color-button" onClick={handleColorButtonClick} title={props.title}>
        <div className="mce-ico mce-i-forecolor"/>
        <div className="preview" style={{ backgroundColor: color[0] }}/>
      </div>
      <div className="down-button" onClick={handleDownButtonClick} title={props.title}>
        <div className="mce-caret"/>
      </div>
      {popupPosition && <div className="popup" style={{ ...popupPosition }}>
        {COLORS.map((color, index) => (
          <div
            key={index}
            className="color"
            style={{ backgroundColor: color[0] }}
            title={color[1]}
            onClick={() => handleColorPick(color)}
          />
        ))}
        <div
          className="color no-color"
          title="No color"
          onClick={handleColorClear}
        >x
        </div>
      </div>}
    </div>
  )
}
