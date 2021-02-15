import { randomString } from './utils';

class Provider {
	constructor(options) {
		this.subscriptions = [];
		this.onSubscribe = options.onSubscribe;
		this.onUnsubscribe = options.onUnsubscribe;
	}

	subscribe(subscription) {
		subscription.id = randomString();
		this.subscriptions.push(subscription);
		this.onSubscribe(subscription);
	}

	unsubscribe(listener) {
		let subscription = this.subscriptions.find(s => s.listener === listener);
		this.subscriptions.splice(this.subscriptions.indexOf(subscription), 1);
		this.onUnsubscribe(subscription);
	}

	notify(id, type, data) {
		this.subscriptions.forEach(subscription => {
			if (subscription.id === id && subscription.type === type) {
				subscription.listener(data);
				subscription.cachedData = data;
			}
		});
	}

	getCachedData(nodeId, type) {
		let subscription = this.subscriptions.find(s => s.nodeId === nodeId);
		return subscription && subscription.cachedData || null;
	}
}

export default Provider;
