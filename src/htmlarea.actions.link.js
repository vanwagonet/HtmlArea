/**
 * Create, update, and remove links
 **/
HtmlArea.Actions.addActions({ link:{ title:'Link', text:'<b>&#9741;</b>',
	update: function(editor, btn) {
		var link = this.getLink(editor);
		if (link) { this.show(editor, btn.addClass('active'), link.get('href'), link); }
		else { this.hide(editor, btn.removeClass('active')); }
		return link;
	},

	run: function(editor, btn) {
		var url = editor.getRange('text');
		if (url && this.getLink(editor)) { return; }
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
					html: '<input type="text" name="url" placeholder="Enter URL" />'
						+ '<a><span>&times;</span></a>'
				}).store('htmlarea-link:editor', editor)
				.addEvent('mousedown', this.uiMousedown.bind(this, editor))
				.inject(editor.element))
			);
			ui.getFirst('input').addEvents({
				focus:this.urlFocus.bind(this, ui), blur:this.urlBlur.bind(this, editor)
			});
		}
		return ui;
	},

	show: function(editor, btn, url, link) {
		var ui = this.getUI(editor);
		ui.getFirst('input').set('value', url);
		ui.addClass('show');
		editor.fireEvent('showLinkPanel', { editor:editor, panel:ui, link:link, action:this });
	},

	hide: function(editor) {
		var ui = this.getUI(editor).removeClass('show');
		editor.fireEvent('hideLinkPanel', { editor:editor, panel:ui, action:this });
	},

	urlFocus: function(ui, e) {
		ui.addClass('focus');
	},

	urlBlur: function(editor, e) {
		var input = $(e.target);
		this.getUI(editor).removeClass('focus');
		editor.content.focus();
		this.getLink(editor).href = input.value;
	},

	uiMousedown: function(editor, e) {
		var target = $(e.target), ui, link;
		if (target.get('tag') === 'input') { return; }
		if (target.get('tag') === 'span') { target = target.getParent(); }
		if (target.get('tag') === 'a') {
			ui = target.getParent('.htmlarea-link');
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
