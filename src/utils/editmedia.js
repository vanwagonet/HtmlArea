HtmlArea.Utils.EditMedia = new Class({

	Implements: [ Events, Options ],

	options: {
		tags: 'img,video,iframe,object,embed'
	},

	initialize: function(editor, o) {
		this.setOptions(o);
		this.editor = editor;
		this.tags = this.options.tags;
		this.tagExpr = new RegExp('^\\s*<(' + this.tags.split(',').join('|') + ')\\b[^>]*>\\s*$', 'i');
		this.select = this.select.bind(this);
		this.maskOut = this.maskOut.bind(this);
		this.editor.content.addEvents({ mouseover:this.mouseOver.bind(this) });
		if (this.editor.content.attachEvent) { // prevent IE's img resizers
			this.editor.content.attachEvent('oncontrolselect', function(e) { e.returnValue = false; });
		}
	},

	emptyGif: 'data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',

	template: '<img src="{emptyGif}" /><div class="tools">{tools}</div><div class="resize">{resizeTools}</div>',

	tools: [
		{ tool:'float-left', title:'Float Left', text:'<hr class="full"/><hr/><hr/><hr/><hr/><hr class="full"/><b></b>' },
		{ tool:'float-none', title:'Inline', text:'<hr class="full"/><hr/ class="left"><hr class="right"/><hr class="full"/><b></b>' },
		{ tool:'float-right', title:'Float Right', text:'<hr class="full"/><hr/><hr/><hr/><hr/><hr class="full"/><b></b>' },
		'|',
		{ tool:'remove', title:'Remove', text:'&times;' }
	],

	resizeTools: [
		{ tool:'resize-top', title:'Resize', text:'&nbsp;' },
		{ tool:'resize-left', title:'Resize', text:'&nbsp;' },
		{ tool:'resize-right', title:'Resize', text:'&nbsp;' },
		{ tool:'resize-bottom', title:'Resize', text:'&nbsp;' },
		{ tool:'resize-top-left', title:'Resize', text:'&nbsp;' },
		{ tool:'resize-top-right', title:'Resize', text:'&nbsp;' },
		{ tool:'resize-bottom-left', title:'Resize', text:'&nbsp;' },
		{ tool:'resize-bottom-right', title:'Resize', text:'&nbsp;' }
	],

	mouseOver: function(e) {
		if (!this.tags.contains($(e.target).get('tag'), ',')) { return; }
		if (!this.mask) {
			this.mask = new Element('img.htmlarea-edit-media-mask');
			this.mask.set('src', this.emptyGif);
			this.mask.addEvents({ mouseout:this.maskOut, mousedown:this.select });
		}
		this.maskElm($(e.target));
	},

	maskOut: function(e) {
		this.masked = null;
		this.mask.dispose();
	},

	maskElm: function(elm) {
		var size = elm.getSize(), pos = elm.getPosition(this.editor.element);
		this.mask.setStyles({ width:size.x, height:size.y, left:pos.x, top:pos.y })
			.inject(this.editor.element);
		this.masked = elm;
	},

	getUI: function() {
		if (this.ui) { return this.ui; }
		var data = {
			emptyGif: this.emptyGif,
			tools: this.editor.buildTools(this.tools),
			resizeTools: this.editor.buildTools(this.resizeTools)
		}
		this.ui = new Element('div.htmlarea-edit-media', {
			html:this.template.substitute(data)
		}).addEvents({ mousedown:this.edit.bind(this) });
		this.proxy = this.ui.getElement('img');
		this.resizeMouseMove = this.resizeMouseMove.bind(this);
		this.resizeMouseDone = this.resizeMouseDone.bind(this);
		this.editor.fireEvent('buildEditMediaPanel', { editor:this.editor, panel:this.ui, tool:this });
		return this.ui;
	},

	select: function(e) {
		e.preventDefault();
		this.editor.select(this.masked);
		if (!this.elm) {
			this.elm = this.masked;
			this.show();
		}
	},

	update: function() {
		var range = this.editor.getRange(), oRange = range, elm, next, prev, tags = this.tags;
		if (range && range.cloneRange) { // W3C Range
			range = range.cloneRange(); // don't change the position of caret
			if (range.startContainer.nodeType === 3 && range.startOffset === range.startContainer.length) { range.setStartAfter(range.startContainer); }
			while (range.startOffset === range.startContainer.childNodes.length) { range.setStartAfter(range.startContainer); }
			while (!range.endOffset) { range.setEndBefore(range.endContainer); }

			next = range.startContainer, prev = range.endContainer;
			if (next.nodeType !== 3) { next = next.childNodes[range.startOffset]; }
			if (prev.nodeType !== 3) { prev = prev.childNodes[range.endOffset-1]; }

			if (oRange.collapsed) {
				if (tags.contains(prev.nodeName.toLowerCase(), ',')) { elm = prev; }
				if (tags.contains(next.nodeName.toLowerCase(), ',')) { elm = next; }
			} else if (prev == next && tags.contains(next.nodeName.toLowerCase(), ',')) { elm = next; }
		} else if (range && range.duplicate) { // IE TextRange
			if (this.tagExpr.test(range.htmlText)) {
				elm = range.parentElement();
			}
		}
		if (this.masked) { this.maskElm(this.masked); }
		if (elm) {
			this.elm = $(elm);
			this.show();
		} else {
			this.elm = null;
			this.hide();
		}
	},

	show: function() {
		var elm = this.elm, ui = this.getUI(), editor = this.editor,
			floatd = elm.getStyles('float')['float'] || 'none',
			pos = elm.getPosition(editor.element), size = elm.getSize();
		ui.getElements('a').removeClass('active');
		ui.getElement('.float-' + floatd).addClass('active');
		ui.setStyles({ width:size.x, height:size.y, left:pos.x, top:pos.y });
		if (elm.get('tag') === 'img') { this.proxy.set('src', elm.get('src')); }
		else { this.proxy.set('src', this.emptyGif); }
		editor.fireEvent('showEditMediaPanel', {
			editor:editor, panel:ui.inject(editor.element), element:elm, tool:this
		});
	},

	hide: function() {
		this.editor.fireEvent('hideEditMediaPanel', {
			editor:this.editor, panel:this.getUI().dispose(), element:this.elm, tool:this
		});
	},

	edit: function(e) {
		e.preventDefault(); // don't change focus
		var a = $(e.target), tool;
		if (!a.get('data-tool')) { a = a.getParent('[data-tool]'); }
		if (!a || !(tool = a.get('data-tool'))) { return; }
		if (tool.indexOf('resize-') === 0) {
			this.runResize(this.elm, e, tool.substr(6).camelCase());
		} else {
			this[('run-' + tool).camelCase()](this.elm, e);
		}
	},

	runRemove: function(elm) {
		if (elm.getParent().get('href') === elm.get('src')) { elm = elm.getParent(); }
		elm.destroy();
		this.hide();
	},

	runFloatLeft: function(elm) {
		elm.setStyle('float', 'left');
		this.show();
	},

	runFloatNone: function(elm) {
		elm.setStyle('float', '');
		this.show();
	},

	runFloatRight: function(elm) {
		elm.setStyle('float', 'right');
		this.show();
	},

	runResize: function(elm, e, from) {
		var size = elm.getSize(), pos = elm.getPosition(this.editor.element);
		this.mouseOffset = { from:from, size:size, pos:pos,
			x: from.contains('Left') ? (e.page.x + size.x) : (e.page.x - size.x),
			y: from.contains('Top')  ? (e.page.y + size.y) : (e.page.y - size.y)
		};
		this.aspect = (size.x || 1) / (size.y || 1);
		$(document.body).addEvents({
			mousemove: this.resizeMouseMove,
			mouseup: this.resizeMouseDone,
			mouseleave: this.resizeMouseDone
		});
	},

	resizeMouseMove: function(e) {
		var off = this.mouseOffset,
			styles = this['resizeMove'+off.from](e, off, off.size, off.pos);
		this.ui.setStyles(styles);
	},

	resizeMouseDone: function(e) {
		$(document.body)
			.removeEvent('mousemove', this.resizeMouseMove)
			.removeEvent('mouseup', this.resizeMouseDone)
			.removeEvent('mouseleave', this.resizeMouseDone);
		var elm = this.editor.element, size = this.ui.getStyles('width', 'height'),
			pos = this.elm.setStyles(size).getPosition(elm);
		this.ui.setStyles({ left:pos.x, top:pos.y });
	},

	resizeMoveTop: function(e, off, oSize, oPos) {
		var size = this.keepAspect(1, (off.y - e.page.y));
		size.top = oPos.y + (oSize.y - size.height);
		size.left = oPos.x + ((oSize.x - size.width) / 2);
		return size;
	},

	resizeMoveLeft: function(e, off, oSize, oPos) {
		var size = this.keepAspect((off.x - e.page.x), 1);
		size.top = oPos.y + ((oSize.y - size.height) / 2);
		size.left = oPos.x + (oSize.x - size.width);
		return size;
	},

	resizeMoveRight: function(e, off, oSize, oPos) {
		var size = this.keepAspect((e.page.x - off.x), 1);
		size.top = oPos.y + ((oSize.y - size.height) / 2);
		return size;
	},

	resizeMoveBottom: function(e, off, oSize, oPos) {
		var size = this.keepAspect(1, (e.page.y - off.y));
		size.left = oPos.x + ((oSize.x - size.width) / 2);
		return size;
	},

	resizeMoveTopLeft: function(e, off, oSize, oPos) {
		var size = this.keepAspect((off.x - e.page.x), (off.y - e.page.y));
		size.left = oPos.x + (oSize.x - size.width);
		size.top = oPos.y + (oSize.y - size.height);
		return size;
	},

	resizeMoveTopRight: function(e, off, oSize, oPos) {
		var size = this.keepAspect((e.page.x - off.x), (off.y - e.page.y));
		size.top = oPos.y + (oSize.y - size.height);
		return size;
	},

	resizeMoveBottomLeft: function(e, off, oSize, oPos) {
		var size = this.keepAspect((off.x - e.page.x), (e.page.y - off.y));
		size.left = oPos.x + (oSize.x - size.width);
		return size;
	},

	resizeMoveBottomRight: function(e, off, oSize, oPos) {
		return this.keepAspect((e.page.x - off.x), (e.page.y - off.y));
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
