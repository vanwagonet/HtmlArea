/**
 * A simple but extensible rich-text editor
 * copyright 2011 - Andy VanWagoner
 * license: MIT
 **/
HtmlArea = function(content, o, s) {
	var ta, bar;

	this.options = (o = HtmlArea.Utils.merge(this.options, o));
	this.strings = (s = HtmlArea.Utils.merge(this.strings, s));
	if (this.setupEvents) { this.setupEvents(o); }

	o.tools = this.optionToArray(o.tools);
	o.utils = this.optionToArray(o.utils);

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
	HtmlArea.Utils.addClass(content, 'content');
	content.contentEditable = true;
	content.spellcheck = true;
	if (this.can('styleWithCSS')) { this.exec('styleWithCSS', false); } // prefer tags to styles
	if (!/\S/.test(content.innerHTML)) { content.innerHTML += HtmlArea.pbr; }

	if (o.mode === 'html') { this.setHTMLMode(); }
	else { this.mode = 'visual'; }

	bar = (this.tools = document.createElement('div'));
	bar.className = 'tools ' + o.style;
	bar.innerHTML = this.buildTools(o.tools, s);
	if (o.toolsgo === 'top') { this.element.insertBefore(bar, content); }
	else { this.element.appendChild(bar); }

	this.utils = this.setupUtils(o.utils);

	return this.addListeners();
};
HtmlArea.prototype = {

	options: {
		name: 'content',
		style: 'default',
		mode: 'visual',
		toolsgo: 'top',
		tools: '[bold,italic,underline,strike]|[sub,sup|left,center,right]|[bullet,number,indent,outdent]|[link,image,video,mode]',
		utils: 'EditMedia,Drop'
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

	buildTools: function(tools, strings) {
		var Tools = HtmlArea.Tools, html = '', t, tt, tool,
			cmd = (navigator.platform.indexOf('Mac') === 0) ? '&#8984;' : 'ctrl ';
		for (t = 0, tt = tools.length - 1; t <= tt; ++t) {
			if (tools[t] === '|') { tools[t] = 'separator'; }
			if (Object.prototype.toString.call(tools[t]) === '[object Array]') {
				html += '<span class="tools">' + this.buildTools(tools[t], strings) + '</span>';
			} else if (tool = (typeof tools[t] === 'object') ? tools[t] : Tools[tools[t]]) {
				html += '<a data-tool="' + tool.tool + '" class="' + tool.tool;
				if (!t) { html += ' first'; }
				if (t === tt) { html += ' last'; }

				html += '" title="' + (strings[tool.title] || tool.title || '');
				if (tool.key) { html += ' ' + cmd + tool.key.toUpperCase(); }

				html += '"><span>' + (tool.text || tool.tool) + '</span><em></em></a>';
				if (tool.setup) { tool.setup(this, this.options[tool.tool+'Options'], this.strings[tool.tool+'Strings']); }
			}
		}
		return html;
	},

	setupUtils: function(utils) {
		var Utils = HtmlArea.Utils, u, uu, util, name, o = this.options, s = this.strings, arr = [];
		for (u = 0, uu = utils.length; u < uu; ++u) {
			name = utils[u].substr(0, 1).toLowerCase() + utils[u].substr(1);
			arr.push(this[name+'Util'] = new Utils[utils[u]](this, o[name+'Options'], s[name+'Strings']));
		}
		return arr;
	},

	addListeners: function() {
		var updateTools = this.bindEvent(this.updateTools);
		this.ons(this.content, { blur:this.updateTextarea, keydown:this.shortcut });
		this.ons(this.content, { focus:updateTools, keyup:updateTools, mouseup:updateTools }, true);
		this.on(this.textarea, 'keydown', this.shortcut);
		this.on(this.tools, 'mousedown', this.toolRun);
		this.on(this.tools, 'mouseup', updateTools, true);
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
		var utils = HtmlArea.Utils;
		utils.addClass(this.element, 'html-mode');
		this.updateTextarea();
		this.textarea.style.height = utils.getComputedStyle(this.content, 'height');
		this.textarea.style.width = utils.getComputedStyle(this.content, 'width');
		this.textarea.style.display = '';
		this.textarea.focus();
		this.content.style.display = 'none';
		this.fire('modechange', { editor:this, mode:(this.mode='html') });
	},

	setVisualMode: function() {
		var utils = HtmlArea.Utils;
		utils.removeClass(this.element, 'html-mode');
		this.updateContent();
		this.textarea.style.display = 'none';
		this.content.style.display = '';
		this.content.focus();
		this.fire('modechange', { editor:this, mode:(this.mode='visual') });
	},

	updateTools: function(e) {
		if (!/\S/.test(this.content.innerHTML)) {
			this.content.innerHTML += HtmlArea.pbr;
			this.select(this.content.firstChild);
		}

		var map = this.updateTools.toolMap, btn, state, cmd,
			Tools = HtmlArea.Tools, tool, name, utils = HtmlArea.Utils;

		if (!map) {
			map = (this.updateTools.toolMap = {});
			this.updateToolMap(map, this.options.tools);
		}
		for (name in map) {
			if ((tool = Tools[name]).update) {
				tool.update(this, map[name], e);
			} else if (cmd = tool.command) {
				btn = map[name];
				state = this.has(cmd);
				if (state === false) {
					utils.removeClass(btn, 'active');
					utils.removeClass(btn, 'indeterminate');
				} else if (state) {
					utils.addClass(btn, 'active');
					utils.removeClass(btn, 'indeterminate');
				} else {
					utils.removeClass(btn, 'active');
					utils.addClass(btn, 'indeterminate');
				}
			}
		}

		var utils = this.utils, u, uu, util;
		for (u = 0, uu = utils.length; u < uu; ++u) {
			if ((util = utils[u]).update) { util.update(); }
		}
	},

	updateToolMap: function(map, tools) {
		var t, tt = tools.length, bar = this.tools,
			Tools = HtmlArea.Tools, tool;
		for (t = 0; t < tt; ++t) {
			if (Object.prototype.toString.call(tools[t]) === '[object Array]') {
				this.updateToolMap(map, tools[t]);
			} else if (tool = Tools[tools[t]]) {
				if (tool.update || tool.command) { // only stateful tools
					map[tools[t]] = bar.querySelector('.' + tools[t]);
				}
			}
		}
	},

	toolRun: function(e) {
		var a = e.target, tool;
		while (a && a != this.tools && !a.getAttribute('data-tool')) { a = a.parentNode; }
		if (a) {
			tool = HtmlArea.Tools[a.getAttribute('data-tool')];
			if (tool) { tool.run(this, a, e); }
		}
		if (e.preventDefault) { e.preventDefault(); } // prevent losing focus
		return e.returnValue = false;
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
			var a = this.tools.querySelector('.' + t.tool);
			t.run(this, a, e);
		}
	},

	exec: function(cmd, val, ui) {
		this.content.focus();
		document.execCommand(cmd, ui || null, val || false);
	},

	has: function(cmd) {
		return document.queryCommandIndeterm(cmd) ? undefined :
			document.queryCommandState(cmd);
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
	}
};

HtmlArea.pbr = '<p><br/></p>';

