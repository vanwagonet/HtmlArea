/**
 * Creates a prototype including event handling
 **/
HtmlArea.Utils.Events = function(proto) {
	if (this instanceof HtmlArea.Utils.Events) { return HtmlArea.Utils.Events(proto); }

	proto = proto || {};
	var mixin = HtmlArea.Utils.Events.prototype, m;
	for (m in mixin) { proto[m] = mixin[m]; }
	return proto;
};

HtmlArea.Utils.Events.prototype = {
	bindEvent: function(fn) {
		var o = this, slice = Array.prototype.slice, args = slice.call(arguments, 1);
		return function(e) {
			e = e || window.event;
			if (e) { e.target = e.target || e.srcElement; }
			return fn.apply(o, [e].concat(args, slice.call(arguments, 1)));
		};
	},

	bind: function(fn) {
		var o = this, slice = Array.prototype.slice, args = slice.call(arguments, 1);
		return function() { return fn.apply(o, args.concat(slice.call(arguments, 0))); };
	},

	setupEvents: function(o) {
		o = o || {};
		this.events = {};
		for (var i in o) {
			i = String(i);
			if (i.substr(0, 2) !== 'on') { continue; }
			this.on(i.substr(2, 1).toLowerCase() + i.substr(3), o[i]);
		}
		return this;
	},

	on: function(node, name, fn, nobind) {
		if (node.addEventListener) {
			if ( ! nobind) { fn = this.bindEvent(fn); }
			node.addEventListener(name, fn, false);
		} else if (node.attachEvent) {
			if ( ! nobind) { fn = this.bindEvent(fn); }
			node.attachEvent('on'+name, fn);
		} else {
			nobind = fn; fn = name; name = node; // shift arguments
			var event = this.events[name] || (this.events[name] = []),
				i = 0, l = event.length;
			if ( ! nobind) { fn = this.bind(fn); }
			while (i < l && event[i] !== fn) { ++i; } // avoid duplicates
			event[i] = fn;
		}
		return fn;
	},

	ons: function(node, map, nobind) {
		if (node.nodeType == 1) {
			for (var i in map) { this.on(node, i, map[i], nobind); }
		} else {
			nobind = map; map = node;
			for (var i in map) { this.on(i, map[i], nobind); }
		}
	},

	off: function(node, name, fn) {
		if (node.removeEventListener) {
			node.removeEventListener(name, fn, false);
		} else if (node.detachEvent) {
			node.detachEvent('on'+name, fn);
		} else {
			fn = name; name = node; // shift arguments
			var event = this.events[name], i;
			if (event) {
				if ( ! fn) { event.length = 0; }
				for (i = event.length - 1; i >= 0; --i) {
					if (event[i] === fn) { event.splice(i, 1); }
				}
			}
		}
		return fn;
	},

	offs: function(node, map) {
		if (node.nodeType == 1) {
			for (var i in map) { this.off(node, i, map[i]); }
		} else {
			map = node;
			for (var i in map) { this.off(i, map[i]); }
		}
	},

	fire: function(name) {
		var args = Array.prototype.slice.call(arguments, 1),
			event = this.events[name], i, l, result = true;
		if ( ! event) { return result; }
		for (i = 0, l = event.length; i < l; ++i) {
			if (event[i].apply(this, args) === false) { result = false; }
		}
		return result;
	}
};

HtmlArea.Utils.Events(HtmlArea.prototype);

