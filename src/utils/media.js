/**
 * Manges sizing and placing media elements
 **/
HtmlArea.Utils.Media = function(editor) {
	HtmlArea.Widget.apply(this, arguments);
	var o = this.options;
	this.on(editor.content, 'mouseover', this.mouseOver);
};
HtmlArea.Utils.Media.prototype = HtmlArea.merge(new HtmlArea.Widget(), {

	emptyGif: 'data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',

	template:
		'<img src="{emptyGif}" />' +
		'<div class="tools">' +
			'<a data-tool="float-left" class="float-left" title="{floatLeft}"><span></span></a>' +
			'<a data-tool="float-none" class="float-none" title="{inline}"><span></span></a>' +
			'<a data-tool="float-right" class="float-right" title="{floatRight}"><span></span></a>' +
			'<a data-tool="remove" class="remove" title="{remove}"><span></span></a>' +
		'</div>' +
		'<div class="resize">' +
			'<a data-tool="resize-top" class="resize-top" title="{resize}"><span></span></a>' +
			'<a data-tool="resize-left" class="resize-left" title="{resize}"><span></span></a>' +
			'<a data-tool="resize-right" class="resize-right" title="{resize}"><span></span></a>' +
			'<a data-tool="resize-bottom" class="resize-bottom" title="{resize}"><span></span></a>' +
			'<a data-tool="resize-top-left" class="resize-top-left" title="{resize}"><span></span></a>' +
			'<a data-tool="resize-top-right" class="resize-top-right" title="{resize}"><span></span></a>' +
			'<a data-tool="resize-bottom-left" class="resize-bottom-left" title="{resize}"><span></span></a>' +
			'<a data-tool="resize-bottom-right" class="resize-bottom-right" title="{resize}"><span></span></a>' +
		'</div>',

	options: {
		tags: 'img,video,iframe,object,embed',
		tools: 'float-left,float-none,float-right,remove',
		resize: 'resize-top,resize-left,resize-right,resize-bottom,resize-top-left,resize-top-right,resize-bottom-left,resize-bottom-right'
	},

	strings: {
		resize: 'Resize',
		inline: 'Inline',
		floatLeft: 'Float Left',
		floatRight: 'Float Right',
		remove: 'Remove'
	},

	mouseOver: function(e) {
		var target = e.target;
		if ((','+this.options.tags+',').indexOf(','+target.nodeName.toLowerCase()+',') < 0) { return; }
		if ( ! this.mask) {
			this.mask = new Image();
			this.mask.className = 'htmlarea-edit-media-mask';
			this.mask.src = this.emptyGif;
			this.on(this.mask, 'mouseout', this.maskOut);
			this.on(this.mask, 'mousedown', this.select);
		}
		this.maskElm(target);
	},

	maskOut: function(e) {
		this.masked = null;
		var parent = this.mask.parentNode;
		if (parent) { parent.removeChild(this.mask); }
	},

	maskElm: function(elm) {
		var style = this.mask.style,
			pos = this.getPosition(elm, this.editor.element);
		style.width = elm.offsetWidth + 'px';
		style.height = elm.offsetHeight + 'px';
		style.left = pos.x + 'px';
		style.top = pos.y + 'px';
		this.editor.element.appendChild(this.mask);
		this.masked = elm;
	},

	getUI: function() {
		if (this.ui) { return this.ui; }
		var ui = (this.ui = document.createElement('div')), bar;
		ui.className = 'htmlarea-edit-media';
		ui.innerHTML = this.format(this.template, this.options, this.strings, this);
		this.proxy = ui.firstChild;

		this.on(ui, 'mousedown', this.edit);
		this.resizeMouseMove = this.bindEvent(this.resizeMouseMove);
		this.resizeMouseDone = this.bindEvent(this.resizeMouseDone);
		this.resizeEvents = {
			mousemove:this.resizeMouseMove, mouseup:this.resizeMouseDone, mouseleave:this.resizeMouseDone
		};
		this.editor.fire('buildEditMediaPanel', { editor:this.editor, panel:ui, tool:this });
		return ui;
	},

	select: function(e) {
		this.editor.select(this.masked);
		if (!this.elm) {
			this.elm = this.masked;
			this.show();
		}
		e.preventDefault();
		return false;
	},

	update: function() {
		var range = this.editor.getRange(), oRange = range, elm, next, prev, tags = ','+this.options.tags+',';
		if (range && range.cloneRange) { // W3C Range, IE <= 8 has to click
			range = oRange.cloneRange(); // don't change the position of caret
			if (range.startContainer.nodeType === 3 && range.startOffset === range.startContainer.length) { range.setStartAfter(range.startContainer); }
			while (range.startOffset === range.startContainer.childNodes.length) { range.setStartAfter(range.startContainer); }
			if ((next = range.startContainer).nodeType !== 3) { next = next.childNodes[range.startOffset]; }

			range = oRange.cloneRange(); // another copy since setStartAfter can change the endContainer
			while (!range.endOffset) { range.setEndBefore(range.endContainer); }
			if ((prev = range.endContainer).nodeType !== 3) { prev = prev.childNodes[range.endOffset-1]; }

			if (oRange.collapsed) {
				if (tags.indexOf(','+prev.nodeName.toLowerCase()+',') >= 0) { elm = prev; }
				if (tags.indexOf(','+next.nodeName.toLowerCase()+',') >= 0) { elm = next; }
			} else if (prev == next && tags.indexOf(','+next.nodeName.toLowerCase()+',') >= 0) { elm = next; }
		}
		if (this.masked) { this.maskElm(this.masked); }
		if ((this.elm = elm || null)) {
			this.show();
		} else {
			this.hide();
		}
	},

	show: function() {
		var elm = this.elm, ui = this.getUI(),
			editor = this.editor, nodes, i, l,
			floatd = this.getStyle(elm, 'float') || 'none',
			pos = this.getPosition(elm, editor.element);
		nodes = ui.getElementsByTagName('a');
		for (i = 0, l = nodes.length; i < l; ++i) {
			this.classes(nodes[i]).remove('active');
		}
		this.classes(ui.querySelector('.float-' + floatd)).add('active');
		ui.style.width = elm.offsetWidth + 'px';
		ui.style.height = elm.offsetHeight + 'px';
		ui.style.left = pos.x + 'px';
		ui.style.top = pos.y + 'px';
		if (elm.nodeName.toLowerCase() === 'img') { this.proxy.src = elm.src; }
		else { this.proxy.src = this.emptyGif; }
		editor.element.appendChild(ui);
		editor.fire('showEditMediaPanel', {
			editor:editor, panel:ui, element:elm, tool:this
		});
	},

	hide: function() {
		var ui = this.getUI(), parent = ui.parentNode;
		if (parent) { parent.removeChild(ui); }
		this.editor.fire('hideEditMediaPanel', {
			editor:this.editor, panel:ui, element:this.elm, tool:this
		});
	},

	edit: function(e) {
		var a = e.target, tool;
		function camel(s) {
			return String(s).replace(/-\D/g, function(m) {
				return m.charAt(1).toUpperCase();
			});
		}
		while (a && a != this.editor.element && !a.getAttribute('data-tool')) { a = a.parentNode; }
		if (a && (tool = a.getAttribute('data-tool'))) {
			if (tool.indexOf('resize-') === 0) {
				this.runResize(this.elm, e, camel(tool.substr(6)));
			} else {
				this[camel('run-' + tool)](this.elm, e);
			}
		}
		// don't change focus
		e.preventDefault();
		return false;
	},

	runRemove: function(elm) {
		if (elm.parentNode.href === elm.src) { elm = elm.parentNode; }
		this.editor.select(elm);
		this.editor.exec('delete');
		this.hide();
	},

	runFloatLeft: function(elm) {
		elm.style.float = 'left';
		this.show();
	},

	runFloatNone: function(elm) {
		elm.style.float = '';
		this.show();
	},

	runFloatRight: function(elm) {
		elm.style.float = 'right';
		this.show();
	},

	runResize: function(elm, e, from) {
		var size = { x:elm.offsetWidth, y:elm.offsetHeight },
			pos = this.getPosition(elm, this.editor.element);
		this.mouseOffset = { from:from, size:size, pos:pos,
			x: from.indexOf('Left') >= 0 ? (e.screenX + size.x) : (e.screenX - size.x),
			y: from.indexOf('Top') >= 0 ? (e.screenY + size.y) : (e.screenY - size.y)
		};
		this.aspect = Math.max(size.x, 1) / Math.max(size.y, 1);
		this.ons(document.body, this.resizeEvents, true);
	},

	resizeMouseMove: function(e) {
		var off = this.mouseOffset, s, style = this.ui.style,
			styles = this['resizeMove'+off.from](e, off, off.size, off.pos);
		for (s in styles) { style[s] = styles[s] + 'px'; }
	},

	resizeMouseDone: function(e) {
		var elm = this.editor.element;
		this.offs(document.body, this.resizeEvents);
		this.elm.style.width = this.getStyle(this.ui, 'width');
		this.elm.style.height = this.getStyle(this.ui, 'height');
		this.show();
	},

	resizeMoveTop: function(e, off, oSize, oPos) {
		var size = this.keepAspect(1, (off.y - e.screenY));
		size.top = oPos.y + (oSize.y - size.height);
		size.left = oPos.x + ((oSize.x - size.width) / 2);
		return size;
	},

	resizeMoveLeft: function(e, off, oSize, oPos) {
		var size = this.keepAspect((off.x - e.screenX), 1);
		size.top = oPos.y + ((oSize.y - size.height) / 2);
		size.left = oPos.x + (oSize.x - size.width);
		return size;
	},

	resizeMoveRight: function(e, off, oSize, oPos) {
		var size = this.keepAspect((e.screenX - off.x), 1);
		size.top = oPos.y + ((oSize.y - size.height) / 2);
		return size;
	},

	resizeMoveBottom: function(e, off, oSize, oPos) {
		var size = this.keepAspect(1, (e.screenY - off.y));
		size.left = oPos.x + ((oSize.x - size.width) / 2);
		return size;
	},

	resizeMoveTopLeft: function(e, off, oSize, oPos) {
		var size = this.keepAspect((off.x - e.screenX), (off.y - e.screenY));
		size.left = oPos.x + (oSize.x - size.width);
		size.top = oPos.y + (oSize.y - size.height);
		return size;
	},

	resizeMoveTopRight: function(e, off, oSize, oPos) {
		var size = this.keepAspect((e.screenX - off.x), (off.y - e.screenY));
		size.top = oPos.y + (oSize.y - size.height);
		return size;
	},

	resizeMoveBottomLeft: function(e, off, oSize, oPos) {
		var size = this.keepAspect((off.x - e.screenX), (e.screenY - off.y));
		size.left = oPos.x + (oSize.x - size.width);
		return size;
	},

	resizeMoveBottomRight: function(e, off, oSize, oPos) {
		return this.keepAspect((e.screenX - off.x), (e.screenY - off.y));
	},

	keepAspect: function(width, height) {
		if (this.aspect) {
			if ((width / height) < this.aspect) {
				width = this.aspect * height;
			} else {
				height = width / this.aspect;
			}
		}
		return { width:width, height:height };
	}
});

