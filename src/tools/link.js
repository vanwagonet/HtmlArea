/**
 * Create, update, and remove links
 *
 * editor.options.linkStrings
 *  placeholder: 'Enter URL' - placeholder text in url field
 *	newWindow: 'Open in a new tab or window' - text for open in new window label
 **/
HtmlArea.Tools.Link = function(editor, o, s) {
	this.editor = editor;
//	this.options = HtmlArea.Utils.merge(this.options, o);
	this.strings = HtmlArea.Utils.merge(this.strings, s);
};
HtmlArea.Tools.Link.prototype = {

	update: function(btn) {
		var link = this.getLink(), utils = HtmlArea.Utils;
		if (link) {
			utils.addClass(btn, 'active');
			this.show(link.getAttribute('href'), link, btn); }
		else {
			utils.removeClass(btn, 'active');
			this.hide(btn);
		}
	},

	strings: {
		placeholder: 'Enter URL',
		newWindow: 'Open in a new tab or window'
	},

	run: function(btn) {
		if (this.editor.mode !== 'visual') { return; }
		if (this.link) { return this.remove(); }
		var text = this.editor.getRange('text'), url = text, link = this;
		if (/^\S+@\S+\.\S+$/.test(url)) { url = 'mailto:' + url; }
		else if (!/^(\S)*[:\/?#.](\S)*$/.test(url)) { url = 'http://'; }
		else if (!/^\w+:\/\//.test(url)) { url = 'http://' + url; }
		this.editor.exec('createlink', url);
		this.show(url, this.getLink(), btn);
		setTimeout(function() {
			link.getUI().firstChild.focus();
			link.getUI().firstChild.select();
		}, 100);
	},

	getLink: function() {
		var editor = this.editor, node = editor.getRange('node'), utils = HtmlArea.Utils, ui = this.getUI();
		if (this.link && ui == node || utils.contains(ui, node)) { return this.link; }
		while (node && node.nodeName.toLowerCase() !== 'a' && node != editor.content) { node = node.parentNode; }
		return node != editor.content && utils.contains(editor.content, node) && node;
	},

	template:
		'<input type="text" class="url" placeholder="{placeholder}" />' +
		'<a>&times;</a><br/>' +
		'<label><input type="checkbox" /> <span>{newWindow}</span></label>',

	getUI: function() {
		if (this.ui) { return this.ui; }
		var ui = (this.ui = document.createElement('div')), utils = HtmlArea.Utils;
		ui.className = 'htmlarea-link';
		ui.innerHTML = utils.format(this.template, this.options, this.strings, this);
		utils.on(ui, 'mousedown', utils.bindEvent(this, this.mouseDown));
		utils.ons(ui.firstChild, {
			keypress: utils.bindEvent(this, this.keyPress),
			change: utils.bindEvent(this, this.change)
		});
		utils.on(ui.lastChild.firstChild, 'change', utils.bindEvent(this, this.change));
		this.editor.fire('buildLinkPanel', { editor:this.editor, panel:ui, tool:this });
		return ui;
	},

	show: function(url, link, btn) {
		if (link == this.link) { return; }
		var ui = this.getUI(), utils = HtmlArea.Utils,
			pos = utils.getPosition(link, this.editor.element);
		this.link = link;
		this.range = this.editor.getRange();
		ui.firstChild.value = url;
		ui.lastChild.firstChild.checked = link.target === '_blank';
		ui.style.left = pos.x + 'px';
		ui.style.top = pos.y+link.offsetHeight + 'px';
		this.editor.element.appendChild(ui);
		this.editor.fire('showLinkPanel', {
			editor:this.editor, panel:ui, link:link, tool:this
		});
	},

	hide: function() {
		this.link = null;
		var ui = this.getUI(), parent = ui.parentNode;
		if (parent) { parent.removeChild(ui); }
		this.editor.fire('hideLinkPanel', {
			editor:this.editor, panel:ui, tool:this
		});
	},

	keyPress: function(e) {
		if ((e.keyCode || e.which || e.charCode) !== 13) { return; }
		this.editor.setRange(this.range);
		e.preventDefault(); // don't submit the form
		return false;
	},

	change: function(e) {
		if (this.link) {
			var ui = this.getUI();
			this.link.href = ui.firstChild.value;
			if (ui.lastChild.firstChild.checked) {
				this.link.target = '_blank';
			} else if (this.link.target === '_blank') {
				this.link.removeAttribute('target');
			}
		}
	},

	mouseDown: function(e) {
		var tag = e.target.nodeName.toLowerCase();
		if (tag === 'input') { return; }
		if (tag === 'a') { this.remove(); }
		e.preventDefault(); // don't change focus
		return false;
	},

	remove: function() {
		if (this.link) { HtmlArea.Utils.unwrap(this.link); }
		this.hide();
	}
};

/**
 * Tool interface
 **/
HtmlArea.Tools.Link.title = 'Link';
HtmlArea.Tools.Link.text = 'link';
HtmlArea.Tools.Link.setup = function(e) { if (!e.linkTool) { e.linkTool = new HtmlArea.Tools.Link(e); } };
HtmlArea.Tools.Link.update = function(editor, btn) { editor.linkTool.update(btn); };
HtmlArea.Tools.Link.run = function(editor, btn) { editor.linkTool.run(btn); };

HtmlArea.Tools.addTool('link', HtmlArea.Tools.Link);
