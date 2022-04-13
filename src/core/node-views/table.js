
class TableView {
	constructor(node) {
		this.node = node
		this.dom = document.createElement("div")
		this.dom.className = "tableWrapper"
		this.table = this.dom.appendChild(document.createElement("table"))
		this.colgroup = this.table.appendChild(document.createElement("colgroup"))
		this.contentDOM = this.table.appendChild(document.createElement("tbody"))
	}

	update(node) {
		if (node.type != this.node.type) return false
		this.node = node
		return true
	}
}

export default function (options) {
	return function (node, view, getPos) {
		return new TableView(node, view, getPos, options);
	};
}
