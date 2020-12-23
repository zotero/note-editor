'use strict';

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, Fragment } from 'react';
import cx from 'classnames'

function MarginLines({ parentRef, pluginState }) {
  const containerRef = useRef();
  const [lines, setLines] = useState([]);

  useLayoutEffect(() => {
    if (!parentRef.current) return;

    let lines = [];
    let parentScrollTop = parentRef.current.scrollTop;
    let parentTop = parentRef.current.getBoundingClientRect().top;

    document.querySelectorAll('.highlight').forEach((node) => {
      let rect = node.getBoundingClientRect();
      lines.push({
        top: parentScrollTop + rect.top - parentTop,
        height: rect.height
      })
    });

    setLines(lines);

  }, [pluginState]);

  return (
    <div ref={containerRef} className="margin-lines">
      {lines.map((line, idx) => {
        return <div key={idx} style={{ top: line.top, height: line.height }}/>
      })}
    </div>
  );
}

export default MarginLines;
