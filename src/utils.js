/**
 * Namespace for useful functions and features not exposed in the toolbar
 **/
HtmlArea.Utils = {
	getPosition: function(elm, relative) {
		var utils = HtmlArea.Utils,
			bound = elm.getBoundingClientRect(),
			html = document.documentElement,
			doc = (!document.compatMode || document.compatMode == 'CSS1Compat') ? html : document.body,
			htmlScroll = { x:window.pageXOffset || doc.scrollLeft, y:window.pageYOffset || doc.scrollTop },
			isFixed = (utils.getComputedStyle(elm, 'position') == 'fixed'),
			position = {
				x:Math.round(bound.left) + ((isFixed) ? 0 : htmlScroll.x) - html.clientLeft,
				y:Math.round(bound.top)  + ((isFixed) ? 0 : htmlScroll.y) - html.clientTop
			};

		if (relative) {
			var rel = utils.getPosition(relative);
			position.x = position.x - rel.x - parseInt(utils.getComputedStyle(relative, 'borderLeftWidth'), 10);
			position.y = position.y - rel.y - parseInt(utils.getComputedStyle(relative, 'borderTopWidth'), 10);
		}
		return position;
	},
	
	getComputedStyle: function(elm, prop) {
		var style = window.getComputedStyle ? window.getComputedStyle(elm) : elm.currentStyle;
		return style ? style[prop] : undefined;
	},

	classes: function(elm) {
		return elm.classList || {
			add: function(cls) { elm.className = ((' '+elm.className+' ').replace(' '+cls+' ', ' ') + ' ' + cls).replace(/^\s+|\s+$/g, ''); },
			remove: function(cls) { elm.className = (' '+elm.className+' ').replace(' '+cls+' ', ' ').replace(/^\s+|\s+$/g, ''); },
			contains: function(cls) { return (' '+elm.className+' ').indexOf(' '+cls+' ') >= 0; }
		};
	},

	addClass: document.documentElement.classList ?
		function(elm, cls) { elm.classList.add(cls); } :
		function(elm, cls) { elm.className = ((' '+elm.className+' ').replace(' '+cls+' ', ' ') + ' ' + cls).replace(/^\s+|\s+$/g, ''); },

	removeClass: document.documentElement.classList ?
		function(elm, cls) { elm.classList.remove(cls); } :
		function(elm, cls) { elm.className = (' '+elm.className+' ').replace(' '+cls+' ', ' ').replace(/^\s+|\s+$/g, ''); },

	hasClass: document.documentElement.classList ?
		function(elm, cls) { return elm.classList.contains(cls); } :
		function(elm, cls) { return (' '+elm.className+' ').indexOf(' '+cls+' ') >= 0; },

	contains: (/\{\s*\[native code\]\s*\}/).test('' + document.documentElement.contains) ?
		function(context, node) { return context.contains(node); } :
	(document.documentElement.compareDocumentPosition ?
		function(context, node) { return context === node || !!(context.compareDocumentPosition(node) & 16); } :
		function(context, node) {
			while (node && node !== context) { node = node.parentNode; }
			return (node === context);
		}),

	merge: function() {
		var o = {}, a, aa = arguments.length, p,
			type = Object.prototype.toString, object = '[object Object]';
		for (p in arguments[0]) { o[p] = arguments[0][p]; }
		for (a = 1; a < aa; ++a) {
			for (p in arguments[a]) {
				if (type.call(o[p]) === object && type.call(arguments[a][p]) === object) {
					o[p] = HtmlArea.Utils.merge(o[p], arguments[a][p]);
				} else {
					o[p] = arguments[a][p];
				}
			}
		}
		return o;
	},

	format: function(str/*, object... */) {
		var args = arguments;
		return String(str).replace((/\\?\{([^{}]+)\}/g), function(match, name){
			if (match.charAt(0) == '\\') return match.slice(1);
			var a = 1, aa = args.length;
			while (a < aa && ( ! args[a] || args[a][name] == null)) { ++a; }
			return (a < aa) ? args[a][name] : '';
		});
	}
};

