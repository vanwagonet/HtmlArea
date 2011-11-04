/**
 * Create, update, and remove links
 **/
HtmlArea.Tools.addTools({ link:{ title:'Link', text:'link',
	update: function(editor, btn) {
		var link = this.getLink(editor);
		if (link) { this.show(editor, btn.addClass('active'), link.get('href'), link); }
		else { this.hide(editor, btn.removeClass('active')); }
		return link;
	},

	run: function(editor, btn, e) {
		var url = editor.getRange('text');
		if (url && this.getLink(editor)) { return; }
		// TODO: check for email address
		if (!/^(\S)*[:\/?#.](\S)*$/.test(url)) { url = 'http://'; }
		if (!/^\w+:\/\//.test(url)) { url = 'http://' + url; }
		editor.exec('createlink', url);
		editor.exec('underline');
		this.show(editor, btn, url);
	},

	getLink: function(editor) {
		var node = editor.getRange('node');
		while (node && node.nodeName.toLowerCase() !== 'a' && node != editor.element) { node = node.parentNode; }
		return node != editor.element && $(node);
	},

	getUI: function(editor) {
		var ui = editor.element.retrieve('htmlarea-link:ui');
		if (!ui) {
			editor.element.store('htmlarea-link:ui',
				(ui = new Element('div.htmlarea-link', {
					html: '<input type="text" class="url" placeholder="Enter URL" />'
						+ '<span class="tools"><a><span>&times;</span></a></span>'
				}).store('htmlarea-link:editor', editor)
				.addEvent('mousedown', this.uiMousedown.bind(this, editor, ui)))
			);
			ui.getFirst('input').addEvents({ keypress:this.urlKeypress.bind(this, editor, ui),
				focus:this.urlFocus.bind(this, editor, ui), blur:this.urlBlur.bind(this, editor, ui)
			});
			editor.fireEvent('buildLinkPanel', { editor:editor, panel:ui, tool:this });
		}
		return ui;
	},

	show: function(editor, btn, url, link) {
		var ui = this.getUI(editor);
		ui.getFirst('input').set('value', url);
		ui.store('htmlarea-link:link', link);
		ui.store('htmlarea-link:range', editor.getRange());
		ui.addClass('show').inject(editor.element);
		editor.fireEvent('showLinkPanel', { editor:editor, panel:ui, link:link, tool:this });
	},

	hide: function(editor) {
		var ui = this.getUI(editor).removeClass('show').dispose();
		editor.fireEvent('hideLinkPanel', { editor:editor, panel:ui, tool:this });
	},

	urlKeypress: function(editor, ui, e) {
		if (e.key === 'enter') {
			e.preventDefault(); // don't submit the form
			editor.setRange(ui.retrieve('htmlarea-link:range'));
		}
	},

	urlFocus: function(editor, ui, e) {
		ui.addClass('focus');
	},

	urlBlur: function(editor, ui, e) {
		ui.removeClass('focus');
		ui.retrieve('htmlarea-link:link').set('href', $(e.target).value);
	},

	uiMousedown: function(editor, ui, e) {
		var target = $(e.target), link;
		if (target.get('tag') === 'input') { return; }
		if (target.get('tag') === 'span') { target = target.getParent(); }
		if (target.get('tag') === 'a') {
			link = this.getLink(editor);
			if (link) {
				link.getChildren('u').each(editor.unwrap);
				editor.unwrap(link);
			}
			this.hide(editor);
		}
		e.preventDefault(); // don't change focus
	}
} });
