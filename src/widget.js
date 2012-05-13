/**
 * Basis for all objects with a UI
 **/
HtmlArea.Widget = function(editor, o, s) {
	if ( ! editor) { return; } // prototyping
	this.editor = editor;
	this.options = this.merge({}, this.options, o);
	this.strings = this.merge({}, this.strings, s);
	HtmlArea.Events.call(this, this.options);
};

HtmlArea.Widget.prototype = HtmlArea.merge(new HtmlArea.Events(), {
	getPosition: function(elm, relative) {
		var bound = elm.getBoundingClientRect(),
			html = document.documentElement,
			doc = (!document.compatMode || document.compatMode == 'CSS1Compat') ? html : document.body,
			htmlScroll = { x:window.pageXOffset || doc.scrollLeft, y:window.pageYOffset || doc.scrollTop },
			isFixed = (this.getStyle(elm, 'position') == 'fixed'),
			position = {
				x:Math.round(bound.left) + ((isFixed) ? 0 : htmlScroll.x) - html.clientLeft,
				y:Math.round(bound.top)  + ((isFixed) ? 0 : htmlScroll.y) - html.clientTop
			};

		if (relative) {
			var rel = this.getPosition(relative);
			position.x = position.x - rel.x - parseInt(this.getStyle(relative, 'borderLeftWidth'), 10);
			position.y = position.y - rel.y - parseInt(this.getStyle(relative, 'borderTopWidth'), 10);
		}
		return position;
	},
	
	getStyle: function(elm, prop) {
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

	format: function(str/*, object... */) {
		var args = arguments, aa = args.length;
		return String(str).replace((/\\?\{([^{}]+)\}/g), function(match, name){
			if (match.charAt(0) == '\\') return match.slice(1);
			var a = 1;
			while (a < aa && ( ! args[a] || args[a][name] == null)) { ++a; }
			return (a < aa) ? args[a][name] : '';
		});
	},

	typeOf: HtmlArea.prototype.typeOf,
	merge: HtmlArea.prototype.merge
});

// make HtmlArea extend HtmlArea.Widget
HtmlArea.prototype = HtmlArea.merge(new HtmlArea.Widget(), HtmlArea.prototype);

