/**
 * A simple but extensible rich-text editor
 * copyright 2011 - Andy VanWagoner
 * license: MIT
 **/
HtmlArea = function(content, o, s) {
	HtmlArea.Widget.call(this, true, o, s);
	o = this.options; s = this.strings;

	var ta, bar;

	o.tools = this.optionToArray(o.tools);
	o.utils = this.optionToArray(o.utils);

	if (this.typeOf(content) === 'String') {
		content = document.querySelector(content);
	}
	this.content = (content = content || document.createElement('div'));
	this.element = document.createElement('div');
	this.element.className = 'htmlarea ' + o.style;
	if (content.parentNode) {
		content.parentNode.insertBefore(this.element, content);
		content.parentNode.removeChild(content);
	}
	this.element.appendChild(content);

	if (content.nodeName.toLowerCase() === 'textarea') {
		ta = (this.textarea = content);
		content = (this.content = document.createElement('div'));
		content.className = ta.className;
		content.innerHTML = o.value || ta.value;
		this.element.insertBefore(content, ta);
	} else {
		if (o.value) { content.innerHTML = o.value; }
		ta = (this.textarea = document.createElement('textarea'));
		ta.name = o.name;
		ta.className = content.className;
		ta.value = this.getHTML();
		this.element.appendChild(ta);
	}
	ta.style.display = 'none';
	ta.spellcheck = false;
	this.classes(content).add('content');
	content.contentEditable = true;
	content.spellcheck = true;
	if (this.can('styleWithCSS')) { this.exec('styleWithCSS', false); } // prefer tags to styles 
	if (this.can('2d-position')) { this.exec('2d-position', false); } // don't use native absolute moving
	if (!/\S/.test(content.innerHTML)) { content.innerHTML += HtmlArea.pbr; }

	if (o.mode === 'html') { this.setHTMLMode(); }
	else { this.mode = 'visual'; }

	bar = (this.toolbar = document.createElement('div'));
	bar.className = 'tools ' + o.style;
	this.tools = {};
	this.buildTools(o.tools, s, bar);
	this.element.appendChild(bar);

	this.utils = this.setupUtils(o.utils, s);

	return this.addListeners();
};

HtmlArea.prototype = {

	options: {
		name: 'content',
		style: 'default',
		mode: 'visual',
		tools: '[bold,italic,underline,strike]|[sub,sup|left,center,right]|[bullet,number,indent,outdent]|[link,image,video,mode]',
		utils: 'Media,Drop'
	},

	strings: {
		bold: 'Bold',
		italic: 'Italic',
		underline: 'Underline',
		strike: 'Strikethrough',
		sub: 'Subscript',
		sup: 'Superscript',
		left: 'Align Left',
		center: 'Align Center',
		right: 'Align Right',
		justify: 'Justify',
		bullet: 'Bullet List',
		number: 'Numbered List',
		indent: 'Increase Indent',
		outdent: 'Decrease Indent',
		undo: 'Undo',
		redo: 'Redo',
		mode: 'View HTML'
	},

	optionToArray: function(opt) {
		if (typeof opt === 'string') {
			opt = '"' + opt.split('|').join(',|,').split(',').join('","') + '"';
			opt = '[' + opt.replace(/"\[/g, '["').replace(/\]"/g, '"]') + ']';
			if (window.JSON && JSON.parse) { opt = JSON.parse(opt); }
			else { opt = (new Function('return (' + opt + ');'))(); }
		}
		return opt;
	},

	buildTools: function(tools, s, bar) {
		function camel(s) {
			return String(s).replace(/-\D/g, function(m) {
				return m.charAt(1).toUpperCase();
			});
		}
		var Tools = HtmlArea.Tools, html = '', t, tt, name,
			o = this.options, a, tool, sub;
		s = s || this.strings;
		for (t = 0, tt = tools.length - 1; t <= tt; ++t) {
			if (tools[t] === '|') { tools[t] = 'separator'; }
			if (this.typeOf(tools[t]) === 'Array') {
				sub = bar.appendChild(document.createElement('span'));
				sub.className = 'tools';
				this.buildTools(tools[t], s, sub);
			} else {
				name = camel('-'+tools[t]); // capital camel case
				if (Tools[name]) {
					a = document.createElement('a');
					tool = new Tools[name](this, o[name+'Options'], s[name+'Strings'], a);
					this.tools[name] = tool;
					a.setAttribute('data-tool', name);
					a.className = name.toLowerCase();
					a.title = tool.getTitle(tool.name = name);
					a.appendChild(document.createElement('span'));
					bar.appendChild(a);
				}
			}
		}
	},

	setupUtils: function(utils, s) {
		var Utils = HtmlArea.Utils, u, uu, util, name, o = this.options, arr = [];
		s = s || this.strings;
		for (u = 0, uu = utils.length; u < uu; ++u) {
			name = utils[u].substr(0, 1).toLowerCase() + utils[u].substr(1);
			arr.push(this[name+'Util'] = new Utils[utils[u]](this, o[name+'Options'], s[name+'Strings']));
		}
		return arr;
	},

	addListeners: function() {
		var updateTools = this.bindEvent(this.updateTools);
		this.ons(this.content, { blur:this.updateTextarea, keydown:this.shortcut });
		this.ons(this.content, {
				focus:updateTools, keyup:updateTools, mouseup:updateTools,
				controlselect:function() { return false; } // don't allow native IE resizers
			}, true);
		this.on(this.textarea, 'keydown', this.shortcut);
		this.on(this.toolbar, 'mousedown', this.toolRun);
		this.on(this.toolbar, 'mouseup', updateTools, true);
		return this;
	},

	updateTextarea: function() {
		this.textarea.value = this.getHTML();
	},

	updateContent: function() {
		var html = HtmlArea.Cleaner.clean(this.textarea.value) || HtmlArea.pbr;
		this.content.innerHTML = html;
	},

	setHTMLMode: function() {
		this.classes(this.element).add('html-mode');
		this.updateTextarea();
		this.textarea.style.height = this.getStyle(this.content, 'height');
		this.textarea.style.width = this.getStyle(this.content, 'width');
		this.textarea.style.display = '';
		this.textarea.focus();
		this.content.style.display = 'none';
		this.fire('modechange', { editor:this, mode:(this.mode='html') });
	},

	setVisualMode: function() {
		this.classes(this.element).remove('html-mode');
		this.updateContent();
		this.textarea.style.display = 'none';
		this.content.style.display = '';
		this.content.focus();
		this.fire('modechange', { editor:this, mode:(this.mode='visual') });
	},

	updateTools: function(e) {
		if ( ! /\S/.test(this.content.innerHTML)) {
			this.content.innerHTML = HtmlArea.pbr;
			this.select(this.content.firstChild);
		}

		var state, cmd, tool, cls, tools = this.tools, t;
		for (t in tools) {
			if ((tool = tools[t]).update) {
				tool.update(e);
			}
		}

		var utils = this.utils, u, uu, util;
		for (u = 0, uu = utils.length; u < uu; ++u) {
			if ((util = utils[u]).update) { util.update(); }
		}
	},

	toolRun: function(e) {
		var a = e.target, tool;
		while (a && a != this.toolbar && ! a.getAttribute('data-tool')) { a = a.parentNode; }
		if (a && (tool = this.tools[a.getAttribute('data-tool')])) { tool.run(e); }
		e.preventDefault(); // prevent losing focus
		return false;
	},

	shortcut: function(e) {
		if (!e || !(e.ctrlKey || e.metaKey)) { return; }

		var keys = this.shortcut.keys, Tools = HtmlArea.Tools, t, k;
		if (!keys) {
			keys = (this.shortcut.keys = {});
			for (t in Tools) {
				if (Tools[t].key && !Tools[t].magic) {
					keys[Tools[t].key.toLowerCase()] = Tools[t];
				}
			}
		}
		k = e.keyCode || e.which || e.charCode;
		k = HtmlArea.keys[k] || String.fromCharCode(k);
		if (t = keys[k.toLowerCase()]) {
			var a = this.toolbar.querySelector('.' + t.tool);
			t.run(this, a, e);
		}
	},

	exec: function(cmd, val, ui) {
		this.content.focus();
		document.execCommand(cmd, ui || null, val || false);
	},

	has: function(cmd) {
		try {
			return document.queryCommandIndeterm(cmd) ? undefined :
				document.queryCommandState(cmd);
		} catch (ex) { return false; }
	},

	can: function(cmd) {
		try { return document.queryCommandSupported(cmd); } catch(ex) {}
	},

	get: function(cmd) {
		return document.queryCommandValue(cmd);
	},

	insert: function(html) {
		if (document.selection && document.selection.createRange) {
			document.selection.createRange().pasteHTML(html);
		} else { this.exec('insertHTML', html); }
	},

	getHTML: function() {
		return HtmlArea.Cleaner.clean(this.content);
	},

	getRange: function(type) {
		var sel = window.getSelection ? window.getSelection() : document.selection,
			range = (sel.rangeCount && sel.getRangeAt && sel.getRangeAt(0)) || (sel.createRange && sel.createRange());
		if (type === 'text') { return range && (range.text || range.toString()) || ''; }
		if (type === 'node') { return range && (range.commonAncestorContainer || (range.parentElement && range.parentElement())) || null; }
		return range;
	},

	setRange: function(range) {
		if (range && window.getSelection) {
			var sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		} else if (range && range.select) {
			range.select();
		}
		this.content.focus();
		this.updateTools();
	},

	select: function(node) {
		var range;
		if (node && document.createRange) {
			range = document.createRange();
			range.setStartBefore(node);
			range.setEndAfter(node);
		} else if (node && document.body.createTextRange) {
			range = document.body.createTextRange();
			range.moveToElementText(node);
		}
		this.setRange(range);
	},

	typeOf: function(v) {
		return Object.prototype.toString.call(v).slice(1, -1).split(' ')[1];
	},

	merge: function() {
		var o = arguments[0], a, aa = arguments.length, p,
			type = Object.prototype.toString, object = '[object Object]';
		for (a = 1; a < aa; ++a) {
			for (p in arguments[a]) {
				if (type.call(o[p]) === object && type.call(arguments[a][p]) === object) {
					o[p] = this.merge(o[p], arguments[a][p]);
				} else {
					o[p] = arguments[a][p];
				}
			}
		}
		return o;
	}
};

HtmlArea.pbr = '<p><br/></p>';
HtmlArea.merge = HtmlArea.prototype.merge;
HtmlArea.Utils = {}; // Namespace for useful functions and features not exposed in the toolbar

