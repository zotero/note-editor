'use strict';

import React, { useState, useRef, useCallback, useEffect } from 'react';

const POPUP_WIDTH = 154;

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

function ColorPicker(props) {
  const [color, setColor] = useState(COLORS[DEFAULT_COLOR_INDEX]);
  const [popupPosition, setPopupPosition] = useState(null);
  const colorPickerRef = useRef();

  const handleDragLeaveCallback = useCallback(handleWindowMousedown, []);

  useEffect(() => {
    window.addEventListener('mousedown', handleDragLeaveCallback);
    return () => {
      window.removeEventListener('mousedown', handleDragLeaveCallback);
    }
  }, [handleDragLeaveCallback]);

  function handleWindowMousedown(event) {
    if (!event.target.closest('.color-picker')) {
      setPopupPosition(null);
    }
  }

  function openPopup() {
    if (colorPickerRef.current) {
      let rect = colorPickerRef.current.getBoundingClientRect();
      console.log('openPopup', rect)
      let left = rect.left - (POPUP_WIDTH - colorPickerRef.current.offsetWidth) / 2;
      let top = rect.top + colorPickerRef.current.offsetHeight;
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
    props.type.run(props.view.state, props.view.dispatch, props.view, color[0]);
  }

  function handleDownButtonClick(event) {
    openPopup();
    props.type.run(props.view.state, props.view.dispatch, props.view, color);
    event.preventDefault();
  }

  function handleColorPick(color) {
    // setIsShowingPopup(false);
    setColor(color);
    props.type.run(props.view.state, props.view.dispatch, props.view, color[0]);
  }

  function handleColorClear() {
    // setIsShowingPopup(false);
    props.type.run(props.view.state, props.view.dispatch, props.view, null);
    setColor(COLORS[DEFAULT_COLOR_INDEX]);
  }

  return (
    <div ref={colorPickerRef} className="color-picker">
      <div className="color-button" style={{ backgroundColor: color[0] }} onClick={handleColorButtonClick}/>
      <div className="down-button" onClick={handleDownButtonClick}>
        <div className="mce-caret"/>
      </div>
      {popupPosition && <div className="popup" style={{ ...popupPosition }}>
        {COLORS.map(color => (
          <div
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

export default ColorPicker;
