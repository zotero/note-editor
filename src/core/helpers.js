
// Code from https://github.com/ueberdosis/tiptap/tree/main/packages/core/src/helpers

function objectIncludes(object1, object2) {
  const keys = Object.keys(object2)

  if (!keys.length) {
    return true
  }

  return !!keys
    .filter(key => object2[key] === object1[key])
    .length
}

// ***

function findMarkInSet(marks, type, attributes = {}) {
  return marks.find(item => {
    return item.type === type && objectIncludes(item.attrs, attributes)
  })
}

function isMarkInSet(marks, type, attributes= {}) {
  return !!findMarkInSet(marks, type, attributes)
}

export function getMarkRange($pos, type, attributes = {}) {
  if (!$pos || !type) {
    return
  }

  const start = $pos.parent.childAfter($pos.parentOffset)

  if (!start.node) {
    return
  }

  const mark = findMarkInSet(start.node.marks, type, attributes)

  if (!mark) {
    return
  }

  let startIndex = $pos.index()
  let startPos = $pos.start() + start.offset
  let endIndex = startIndex + 1
  let endPos = startPos + start.node.nodeSize

  findMarkInSet(start.node.marks, type, attributes)

  while (startIndex > 0 && mark.isInSet($pos.parent.child(startIndex - 1).marks)) {
    startIndex -= 1
    startPos -= $pos.parent.child(startIndex).nodeSize
  }

  while (
    endIndex < $pos.parent.childCount
    && isMarkInSet($pos.parent.child(endIndex).marks, type, attributes)
  ) {
    endPos += $pos.parent.child(endIndex).nodeSize
    endIndex += 1
  }

  return {
    from: startPos,
    to: endPos,
  }
}

export function getMarkAttributes(state, type) {
  const { from, to, empty } = state.selection
  let marks = []

  if (empty) {
    marks = state.selection.$head.marks()
  } else {
    state.doc.nodesBetween(from, to, node => {
      marks = [...marks, ...node.marks]
    })
  }

  const mark = marks.find(markItem => markItem.type.name === type.name)

  if (mark) {
    return { ...mark.attrs }
  }

  return {}
}

export function getMarkRangeAtCursor(state, type) {
	const { selection } = state;
	const { $from, empty } = selection;

	if (empty) {
		const start = $from.parent.childAfter($from.parentOffset);
		if (start.node) {
			const mark = start.node.marks.find(mark => mark.type === type);
			if (mark) {
				return getMarkRange($from, type, mark.attrs);
			}
		}
	}

	return null;
}

export function getActiveMarks(state, type, attributes = {}) {
	const { from, to, empty } = state.selection

	if (empty) {
		return !!(state.storedMarks || state.selection.$from.marks())
		.filter(mark => {
			if (!type) {
				return true
			}

			return type.name === mark.type.name
		})
		.find(mark => objectIncludes(mark.attrs, attributes))
	}
}

export function isMarkActive(state, type, attributes = {}){
  const { from, to, empty } = state.selection

  if (empty) {
    return !!(state.storedMarks || state.selection.$from.marks())
      .filter(mark => {
        if (!type) {
          return true
        }

        return type.name === mark.type.name
      })
      .find(mark => objectIncludes(mark.attrs, attributes))
  }

  let selectionRange = 0
  let markRanges = []

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isText) {
      const relativeFrom = Math.max(from, pos)
      const relativeTo = Math.min(to, pos + node.nodeSize)
      const range = relativeTo - relativeFrom

      selectionRange += range

      markRanges = [...markRanges, ...node.marks.map(mark => ({
        mark,
        from: relativeFrom,
        to: relativeTo,
      }))]
    }
  })

  if (selectionRange === 0) {
    return false
  }

  // calculate range of matched mark
  const matchedRange = markRanges
    .filter(markRange => {
      if (!type) {
        return true
      }

      return type.name === markRange.mark.type.name
    })
    .filter(markRange => objectIncludes(markRange.mark.attrs, attributes))
    .reduce((sum, markRange) => {
      const size = markRange.to - markRange.from

      return sum + size
    }, 0)

  // calculate range of marks that excludes the searched mark
  // for example `code` doesn’t allow any other marks
  const excludedRange = markRanges
    .filter(markRange => {
      if (!type) {
        return true
      }

      return markRange.mark.type !== type
        && markRange.mark.type.excludes(type)
    })
    .reduce((sum, markRange) => {
      const size = markRange.to - markRange.from

      return sum + size
    }, 0)

  // we only include the result of `excludedRange`
  // if there is a match at all
  const range = matchedRange > 0
    ? matchedRange + excludedRange
    : matchedRange

  return range >= selectionRange
}
