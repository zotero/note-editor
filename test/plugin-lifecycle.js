/* eslint-env mocha */

import { expect } from 'chai';
import { EditorState } from 'prosemirror-state';

import { drag } from '../src/core/plugins/drag.js';
import { highlightColor } from '../src/core/plugins/highlight-color.js';
import { search, searchKey } from '../src/core/plugins/search.js';
import { textColor } from '../src/core/plugins/text-color.js';
import { underlineColor } from '../src/core/plugins/underline-color.js';
import { schema } from '../src/core/schema/index.js';
import { throttle } from '../src/core/utils.js';

class ListenerTarget {
	constructor() {
		this.listeners = new Map();
	}

	addEventListener(type, listener) {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, new Set());
		}
		this.listeners.get(type).add(listener);
	}

	removeEventListener(type, listener) {
		this.listeners.get(type)?.delete(listener);
	}

	dispatchEvent(type, event = {}) {
		for (let listener of this.listeners.get(type) || []) {
			listener(event);
		}
	}

	listenerCount(type) {
		return this.listeners.get(type)?.size || 0;
	}
}

describe('Plugin lifecycle', () => {
	let originalWindow;

	beforeEach(() => {
		originalWindow = global.window;
		global.window = new ListenerTarget();
	});

	afterEach(() => {
		if (originalWindow === undefined) {
			delete global.window;
		}
		else {
			global.window = originalWindow;
		}
	});

	it('can recreate and destroy plugin views repeatedly', () => {
		let plugins = [
			textColor(),
			highlightColor(),
			underlineColor(),
			drag()
		];
		let state = EditorState.create({ schema, plugins });
		let dom = new ListenerTarget();
		let view = { state, dom };

		for (let i = 0; i < 2; i++) {
			let pluginViews = plugins
				.filter(plugin => plugin.spec.view)
				.map(plugin => plugin.spec.view(view));

			expect(dom.listenerCount('mousemove')).to.equal(1);
			expect(window.listenerCount('mouseup')).to.equal(1);
			expect(() => {
				while (pluginViews.length) {
					pluginViews.pop().destroy?.();
				}
			}).not.to.throw();
			expect(dom.listenerCount('mousemove')).to.equal(0);
			expect(window.listenerCount('mouseup')).to.equal(0);
		}
	});

	it('cleans up drag view resources', () => {
		let dom = new ListenerTarget();
		let pluginView = drag().spec.view({ dom });
		let dragHandleRemoved = false;
		let throttleCancelled = false;
		let cancel = pluginView.updateDragHandle.cancel;
		pluginView.updateDragHandle.cancel = () => {
			throttleCancelled = true;
			cancel();
		};
		pluginView.dragHandleNode = {
			remove() {
				dragHandleRemoved = true;
			}
		};
		pluginView.mouseIsDown = true;
		window.dispatchEvent('mouseup');
		expect(pluginView.mouseIsDown).to.equal(false);

		pluginView.destroy();
		pluginView.mouseIsDown = true;
		window.dispatchEvent('mouseup');

		expect(throttleCancelled).to.equal(true);
		expect(dragHandleRemoved).to.equal(true);
		expect(pluginView.dragHandleNode).to.equal(null);
		expect(pluginView.mouseIsDown).to.equal(true);
		expect(dom.listenerCount('mousemove')).to.equal(0);
		expect(window.listenerCount('mouseup')).to.equal(0);
	});

	it('preserves throttle behavior while allowing pending work to be cancelled', async () => {
		let calls = [];
		let throttled = throttle(value => calls.push(value), 20);

		throttled('first');
		throttled('cancelled');
		expect(calls).to.deep.equal(['first']);

		throttled.cancel();
		await new Promise(resolve => setTimeout(resolve, 40));
		expect(calls).to.deep.equal(['first']);

		throttled('second');
		throttled('trailing');
		await new Promise(resolve => setTimeout(resolve, 40));
		expect(calls).to.deep.equal(['first', 'second', 'trailing']);
	});

	it('cleans up and restores search view resources', () => {
		let plugin = search();
		let state = EditorState.create({ schema, plugins: [plugin] });
		let pluginState = searchKey.getState(state);
		let scrollContainer = new ListenerTarget();
		let view = {
			state,
			dom: {
				closest() {
					return scrollContainer;
				},
				parentElement: scrollContainer
			}
		};
		pluginState.active = true;

		for (let i = 0; i < 2; i++) {
			let pluginView = plugin.spec.view(view);
			pluginState.debounceTimer = setTimeout(() => {}, 1000);
			pluginState.scrollTimer = setTimeout(() => {}, 1000);
			pluginState.focusTimer = setTimeout(() => {}, 1000);
			expect(scrollContainer.listenerCount('scroll')).to.equal(1);
			pluginView.destroy();
			expect(scrollContainer.listenerCount('scroll')).to.equal(0);
			expect(pluginState.debounceTimer).to.equal(null);
			expect(pluginState.scrollTimer).to.equal(null);
			expect(pluginState.focusTimer).to.equal(null);
			expect(pluginState.scrollListenerAttached).to.equal(false);
			expect(pluginState.scrollContainer).to.equal(null);
			expect(pluginState.view).to.equal(null);
		}
	});

	it('resumes a pending search when the plugin view is recreated', async () => {
		let plugin = search();
		let doc = schema.node('doc', null, [
			schema.node('paragraph', null, schema.text('Paragraph'))
		]);
		let state = EditorState.create({ schema, doc, plugins: [plugin] });
		let pluginState = searchKey.getState(state);
		let view = {
			state,
			dom: {
				closest() {
					return null;
				},
				parentElement: null
			},
			dispatch(tr) {
				state = state.apply(tr);
				view.state = state;
			}
		};
		pluginState.active = true;
		pluginState.searchTerm = 'Paragraph';
		pluginState.updateDebounceDelay = 0;

		let firstPluginView = plugin.spec.view(view);
		firstPluginView.destroy();
		expect(pluginState.results).to.have.length(0);

		let secondPluginView = plugin.spec.view(view);
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(pluginState.results).to.have.length(1);
		secondPluginView.destroy();
	});
});
