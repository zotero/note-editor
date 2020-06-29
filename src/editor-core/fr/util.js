export function getNodeEndpoints(context, node) {
  let offset = 0

  if (context === node) return { from: offset, to: offset + node.nodeSize }

  if (node.isBlock) {
    for (let i = 0; i < context.content.content.length; i++) {
      let result = getNodeEndpoints(context.content.content[i], node)
      if (result) return {
        from: result.from + offset + (context.type.kind === null ? 0 : 1),
        to: result.to + offset + (context.type.kind === null ? 0 : 1)
      }
      offset += context.content.content[i].nodeSize
    }
    return null
  }
  else {
    return null
  }
}
