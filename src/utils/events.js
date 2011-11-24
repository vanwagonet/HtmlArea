/**
 * Creates a prototype including event handling
 **/
HtmlArea.Utils.Events = function(proto) {
	proto = proto || {};

	proto.setupEvents = function(o) {
		o = o || {};
		this.events = {};
		for (var i in o) {
			i = String(i);
			if (i.substr(0, 2) !== 'on') { continue; }
			this.on(i.substr(2, 1).toLowerCase() + i.substr(3), o[i]);
		}
		return this;
	};

	proto.on = function(name, fn) {
		var event = this.events[name] || (this.events[name] = []),
			i = 0, l = event.length;
		while (i < l && event[i] !== fn) { ++i; }
		event[i] = fn;
		return this;
	};

	proto.un = function(name, fn) {
		var event = this.events[name], i, l;
		if (!event) { return this; }
		if (!fn) { event.length = 0; }
		for (i = 0, l = event.length; i < l; ++i) {
			if (event[i] === fn) { event.splice(i, 1); }
		}
		return this;
	};

	proto.fire = function(name) {
		var args = Array.prototype.slice.call(arguments, 1),
			event = this.events[name], i, l, result = true;
		if (!event) { return result; }
		for (i = 0, l = event.length; i < l; ++i) {
			if (event[i].apply(this, args) === false) { result = false; }
		}
		return result;
	};

	return proto;
};
HtmlArea.Utils.Events(HtmlArea.prototype);
