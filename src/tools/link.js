/**
 * Create, update, and remove links
 **/
HtmlArea.Tools.Link = new Class({

	initialize: function(editor) { this.editor = editor; },

	update: function(btn) {
		var link = this.getLink();
		if (link) { this.show(link.get('href'), link, btn.addClass('active')); }
		else { this.hide(btn.removeClass('active')); }
	},

	run: function(btn) {
		if (this.editor.mode !== 'visual') { return; }
		if (this.link) { return this.remove(); }
		var url = this.editor.getRange('text');
		if (/^\S+@\S+\.\S+$/.test(url)) { url = 'mailto:' + url; }
		else if (!/^(\S)*[:\/?#.](\S)*$/.test(url)) { url = ''; }
		else if (!/^\w+:\/\//.test(url)) { url = 'http://' + url; }
		editor.exec('createlink', url);
		editor.exec('underline');
		this.show(url, this.getLink(), btn);
	},

	getLink: function() {
		var editor = this.editor, node = editor.getRange('node');
		while (node && node.nodeName.toLowerCase() !== 'a' && node != editor.content) { node = node.parentNode; }
		return node != editor.content && editor.content.contains(node) && $(node);
	},

	template:
		'<input type="text" class="url" placeholder="Enter URL" />' +
		'<a>&times;</a>',

	getUI: function() {
		if (this.ui) { return this.ui; }
		var ui = (this.ui = new Element('div.htmlarea-link', { html:this.template }));
		ui.addEvent('mousedown', this.mouseDown.bind(this));
		ui.getFirst('input').addEvents({ keypress:this.keyPress.bind(this), blur:this.blur.bind(this) });
		this.editor.fireEvent('buildLinkPanel', { editor:this.editor, panel:ui, tool:this });
		return ui;
	},

	show: function(url, link, btn) {
		var ui = this.getUI(), size = link.getSize(),
			pos = link.getPosition(this.editor.element);
		this.link = link;
		this.range = this.editor.getRange();
		ui.getFirst('input').set('value', url);
		ui.setStyles({ left:pos.x, top:pos.y+size.y }).inject(this.editor.element);
		this.editor.fireEvent('showLinkPanel', {
			editor:this.editor, panel:ui, link:link, tool:this
		});
	},

	hide: function() {
		this.link = null;
		this.editor.fireEvent('hideLinkPanel', {
			editor:this.editor, panel:this.getUI().dispose(), tool:this
		});
	},

	keyPress: function(e) {
		if (e.key !== 'enter') { return; }
		e.preventDefault(); // don't submit the form
		this.editor.setRange(this.range);
	},

	blur: function(e) { this.link.set('href', $(e.target).value); },

	mouseDown: function(e) {
		var tag = $(e.target).get('tag');
		if (tag === 'input') { return; }
		if (tag === 'a') { this.remove(); }
		e.preventDefault(); // don't change focus
	},

	remove: function() {
		if (this.link) {
			this.link.getChildren('u').each(this.editor.unwrap);
			this.editor.unwrap(this.link);
		}
		this.hide();
	}
}).extend({

	/**
	 * Tool interface
	 **/
	title:'Link', text:'link',

	setup: function(editor) {
		if (!editor.linkTool) { editor.linkTool = new this(editor); }
	},

	update: function(editor, btn) { editor.linkTool.update(btn); },

	run: function(editor, btn) { editor.linkTool.run(btn); }
});

HtmlArea.Tools.addTool('link', HtmlArea.Tools.Link);
