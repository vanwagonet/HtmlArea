/**
 * Manges sizing and placing media elements
 **/
HtmlArea.Utils.EditMedia = function(editor, o, s) {
	this.editor = editor;
	this.options = HtmlArea.Utils.merge(this.options, o);
	this.strings = HtmlArea.Utils.merge(this.strings, s);
	this.setupEvents(this.options);
	this.on(editor.content, 'mouseover', this.mouseOver);
};
HtmlArea.Utils.EditMedia.prototype = HtmlArea.Events({

	emptyGif: 'data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',

	template: '<img src="{emptyGif}" /><div class="tools">{tools}</div><div class="resize">{resizeTools}</div>',

	options: {
		tags: 'img,video,iframe,object,embed'
	},

	strings: {
		resize: 'Resize',
		inline: 'Inline',
		floatLeft: 'Float Left',
		floatRight: 'Float Right',
		remove: 'Remove'
	},

	tools: [
		{ tool:'float-left', title:'floatLeft', text:'<hr class="full"/><hr/><hr/><hr/><hr/><hr class="full"/><b></b>' },
		{ tool:'float-none', title:'inline', text:'<hr class="full"/><hr/ class="left"><hr class="right"/><hr class="full"/><b></b>' },
		{ tool:'float-right', title:'floatRight', text:'<hr class="full"/><hr/><hr/><hr/><hr/><hr class="full"/><b></b>' },
		'|',
		{ tool:'remove', title:'remove', text:'&times;' }
	],

	resizeTools: [
		{ tool:'resize-top', title:'resize', text:'&nbsp;' },
		{ tool:'resize-left', title:'resize', text:'&nbsp;' },
		{ tool:'resize-right', title:'resize', text:'&nbsp;' },
		{ tool:'resize-bottom', title:'resize', text:'&nbsp;' },
		{ tool:'resize-top-left', title:'resize', text:'&nbsp;' },
		{ tool:'resize-top-right', title:'resize', text:'&nbsp;' },
		{ tool:'resize-bottom-left', title:'resize', text:'&nbsp;' },
		{ tool:'resize-bottom-right', title:'resize', text:'&nbsp;' }
	],

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
			pos = HtmlArea.Utils.getPosition(elm, this.editor.element);
		style.width = elm.offsetWidth + 'px';
		style.height = elm.offsetHeight + 'px';
		style.left = pos.x + 'px';
		style.top = pos.y + 'px';
		this.editor.element.appendChild(this.mask);
		this.masked = elm;
	},

	getUI: function() {
		if (this.ui) { return this.ui; }
		var ui = (this.ui = document.createElement('div'));
		ui.className = 'htmlarea-edit-media';
		ui.innerHTML = HtmlArea.Utils.format(this.template, {
				tools: this.editor.buildTools(this.tools, this.strings),
				resizeTools: this.editor.buildTools(this.resizeTools, this.strings)
			}, this.strings, this);
		this.on(ui, 'mousedown', this.edit);
		this.proxy = ui.getElementsByTagName('img')[0];
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
		var elm = this.elm, ui = this.getUI(), editor = this.editor,
			utils = HtmlArea.Utils, nodes, i, l,
			floatd = utils.getComputedStyle(elm, 'float') || 'none',
			pos = utils.getPosition(elm, editor.element);
		nodes = ui.getElementsByTagName('a');
		for (i = 0, l = nodes.length; i < l; ++i) {
			utils.removeClass(nodes[i], 'active');
		}
		utils.addClass(ui.querySelector('.float-' + floatd), 'active');
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
		var utils = HtmlArea.Utils,
			size = { x:elm.offsetWidth, y:elm.offsetHeight },
			pos = utils.getPosition(elm, this.editor.element);
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
		var utils = HtmlArea.Utils, elm = this.editor.element;
		this.offs(document.body, this.resizeEvents);
		this.elm.style.width = utils.getComputedStyle(this.ui, 'width');
		this.elm.style.height = utils.getComputedStyle(this.ui, 'height');
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

