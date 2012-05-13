/**
 * Create, update, and remove links
 *
 * editor.options.linkStrings
 *  placeholder: 'Enter URL' - placeholder text in url field
 *	newWindow: 'Open in a new tab or window' - text for open in new window label
 **/
HtmlArea.Tools.Link = function() {
	HtmlArea.Tool.apply(this, arguments);
};

HtmlArea.Tools.Link.prototype = HtmlArea.merge(new HtmlArea.Tool(), {

	update: function() {
		var link = this.getLink(), cls = this.classes(this.button);
		if (link) {
			cls.add('active');
			this.show(link.getAttribute('href'), link); }
		else {
			cls.remove('active');
			this.hide();
		}
	},

	strings: {
		placeholder: 'Enter URL',
		newWindow: 'Open in a new tab or window'
	},

	run: function() {
		if (this.editor.mode !== 'visual') { return; }
		if (this.link) { return this.remove(); }
		var text = this.editor.getRange('text'), url = text, link = this;
		if (/^\S+@\S+\.\S+$/.test(url)) { url = 'mailto:' + url; }
		else if (!/^(\S)*[:\/?#.](\S)*$/.test(url)) { url = 'http://'; }
		else if (!/^\w+:\/\//.test(url)) { url = 'http://' + url; }
		this.editor.exec('createlink', url);
		this.show(url, this.getLink());
		setTimeout(function() {
			link.getUI().firstChild.focus();
			link.getUI().firstChild.select();
		}, 100);
	},

	getLink: function() {
		var editor = this.editor, node = editor.getRange('node'), ui = this.getUI();
		if (this.link && ui == node || ui.contains(node)) { return this.link; }
		while (node && node.nodeName.toLowerCase() !== 'a' && node != editor.content) { node = node.parentNode; }
		return node != editor.content && editor.content.contains(node) && node;
	},

	template:
		'<input type="text" class="url" placeholder="{placeholder}" />' +
		'<a>&times;</a><br/>' +
		'<label><input type="checkbox" /> <span>{newWindow}</span></label>',

	getUI: function() {
		if (this.ui) { return this.ui; }
		var ui = (this.ui = document.createElement('div'));
		ui.className = 'htmlarea-link';
		ui.innerHTML = this.format(this.template, this.options, this.strings, this);
		this.on(ui, 'mousedown', this.mouseDown);
		this.ons(ui.firstChild, { keypress:this.keyPress, change:this.change });
		this.on(ui.lastChild.firstChild, 'change', this.change);
		this.editor.fire('buildLinkPanel', { editor:this.editor, panel:ui, tool:this });
		return ui;
	},

	show: function(url, link) {
		if (link == this.link) { return; }
		var ui = this.getUI(),
			pos = this.getPosition(link, this.editor.element);
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
		if (this.link) {
			this.editor.select(this.link);
			this.editor.exec('unlink');
		}
		this.hide();
	}
});

