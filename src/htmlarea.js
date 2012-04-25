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
		if (o.value) { content.value = o.value; }
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
	if (this.query('styleWithCSS', 'support')) { this.exec('styleWithCSS', false); } // prefer tags to styles
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
	fire: function(){}, // gets replaced

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
		var updateTools = this.bindEvent(this, this.updateTools);
		this.ons(this.content, { blur:this.updateTextarea, keydown:this.shortcut });
		this.ons(this.content, { focus:updateTools, keyup:updateTools, mouseup:updateTools }, true);
		this.on(this.tools, 'mousedown', this.toolRun);
		this.on(this.tools, 'mouseup', updateTools, true);
		return this;
	},

	updateTextarea: function() {
		this.textarea.value = this.getHTML();
	},

	updateContent: function() {
		var html = this.cleanHTML(this.textarea.value);
		if (!html) { html = HtmlArea.pbr; }
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
				state = this.query(cmd);
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

	query: function(cmd, type) {
		try {
			if (type === 'support') { return document.queryCommandSupported(cmd); }
			if (type === 'value') { return document.queryCommandValue(cmd); }
			return document.queryCommandIndeterm(cmd) ? undefined :
				document.queryCommandState(cmd);
		} catch(ex) {}
	},

	insert: function(html) {
		if (document.selection && document.selection.createRange) {
			document.selection.createRange().pasteHTML(html);
		} else { this.exec('insertHTML', html); }
	},

	beforeGetHTML: function() {
		var spans = this.content.querySelectorAll('font,span,[style]'),
			styles = HtmlArea.styles, s, ss = styles.length, font,
			style, span, t, tt = spans.length+1;
		spans = Array.prototype.slice.call(spans, 0).concat(this.content);
		for (t = 0; t < tt; ++t) {
			style = (span = spans[t]).style.cssText.replace(/^\s+|\s+$/g, '');
			if (span.nodeName.toLowerCase() === 'font') {
				font = span;
				if (s = font.getAttribute('color')) { style += ' color: ' + s; }
				if (s = font.getAttribute('face')) { style += ' font-face: ' + s; }
				if (s = font.getAttribute('size')) { style += ' font-size: ' + s; }
				span = document.createElement('span');
				span.style.cssText = style;
				while (font.firstChild) { span.appendChild(font.removeChild(font.firstChild)); }
				font.parentNode.insertBefore(span, font);
				font.parentNode.removeChild(font);
			}
			if (style) {
				for (s = 0; s < ss; ++s) {
					if (!styles[s][0].test(style)) { continue; }
					style = style.replace(styles[s][0], styles[s][1]);
					if (styles[s][2]) {
						font = document.createElement(styles[s][2]);
						while (span.firstChild) { font.appendChild(span.removeChild(span.firstChild)); }
						span.appendChild(font);
					}
				}
				span.style.cssText = (style = style.replace(/^\s+|\s+$/g, ''));
			}
			if (!style && span != this.content && span.nodeName.toLowerCase() === 'span') {
				HtmlArea.Utils.unwrap(span);
			}
		}
	},

	cleanHTML: function(html) {
		var options = this.options.cleanOptions || {},
			cleanups = HtmlArea.cleanups,
			cleaned, c, cc = cleanups.length,
			replace = html.replace, max = 10;

		do { for (c = 0, cleaned = html; c < cc; ++c) {
			html = replace.apply(html, cleanups[c]);
		} } while (cleaned != html && --max);

		return html.replace(/^\s+|\s+$/g, '');
	},

	getHTML: function() {
		this.beforeGetHTML(); 
		return this.cleanHTML(this.content.innerHTML);
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

HtmlArea.cleanups = [ // got this started by looking at MooRTE. Thanks Sam!
	// html tidiness
	[ /<[^> ]*/g, function(m) { return m.toLowerCase(); } ], // lowercase tags
	[ /<[^>]*>/g, function(m) {	return m
		.replace(/ [^=]+=/g, function(a) { return a.toLowerCase(); }) // lowercase attributes
		.replace(/( [^=]+=)([^"][^ >]*)/g, '$1"$2"') // quote attributes
		.replace(/ slick-uniqueid="[^"]*"/g, ''); // remove slick added attributes
	} ],
	[ /(<(?:img|input)\b[^>]*[^\/])>/g, '$1 />' ], // self close tags

	// <br/> tag cleanup
	[ /<br\b[^>]*?>/g, '<br/>' ], // normalize <br>
	[ /^<br\/>|<br\/>$/g, '' ], // no leading or trailing <br>
	[ /<br\/>\s*<\/(h1|h2|h3|h4|h5|h6|li|p|div)/g, '</$1' ], // no <br> at end of block
	[ /<p>(?:&nbsp;|\s)*<br\/>(?:&nbsp;|\s)*<\/p>/g, '<p><br/></p>' ], // replace padded <p> with pbr

	// webkit cleanup
	[ / class="apple-style-span"| style=""/gi, '' ], // remove unhelpful attributes	
	[ /^([^<]+)(<?)/, '<p>$1</p>$2' ], // wrap first text in <p>
	[ /<(\/?)div\b/g, '<$1p' ], // change <div> to <p>

	// semantic changes, but prefer b, i, and s instead of strong, em, and del
	[ /<(\/?)strong\b/g, '<$1b' ], // use <b> for bold
	[ /<(\/?)em\b/g, '<$1i' ], // use <i> for italic
	[ /<(\/?)(?:strike|del)\b/g, '<$1s' ], // use <s> for strikethrough

	// normalize whitespace, tag placement
	[ /\s*<(\/?(?:p|ol|ul)\b[^>]*)>\s*/g, '<$1>\n' ], // newline after <p> </p> <ol> </ol> <ul> </ul>
	[ /\s*<li([^>]*)>/g, '\n\t<li$1>' ], // indent <li>
	[ /\s*<\/(p|ol|ul)>/g, '\n</$1>'], // newline before </p> </ol> </ul>
	[ /\s*<img\b([^>*?])>\s*/g, '\n<img$1>\n'], // <img> on its own line
	[ /<p\b[^>]*>\s*<\/p>\s*<(ol|ul)\b/g, '<$1' ], // remove empty <p> before <ul> or <ol>
	[ /(<p\b[^>]*>\s*)(<(ul|ol)\b([^<]|<)*?<\/\3>\s*)/g, '$2$1' ], // move <p> right before <ul> or <ol> to after
	[ /^\s*$/g, '' ] // no empty lines
];

HtmlArea.styles = [
	[ /(text-decoration:.*?)\bline-through\b(;?)/g, '$1$2', 's' ],
	[ /(text-decoration:.*?)\bunderline\b(;?)/g, '$1$2', 'u' ],
	[ /text-decoration:\s*;/, '' ],
	[ /font-style:\s*italic;?/g, '', 'i' ],
	[ /font-weight:\s*bold;?/g, '', 'b' ]
];

HtmlArea.keys = {
	8: 'backspace',
	9: 'tab',
	13: 'enter',
	16: 'shift',
	17: 'ctrl',
	18: 'alt',
	19: 'pause_break',
	20: 'caps_lock',
	27: 'escape',
	33: 'page_up',
	34: 'page_down',
	35: 'end',
	36: 'home',
	37: 'left',
	38: 'up',
	39: 'right',
	40: 'down',
	45: 'insert',
	46: 'delete',
	91: 'windows',
	92: 'windows',
	93: 'context',
	96: '0',
	97: '1',
	98: '2',
	99: '3',
	100: '4',
	101: '5',
	102: '6',
	103: '7',
	104: '8',
	105: '9',
	106: '*',
	107: '+',
	109: '-',
	110: '.',
	111: '/',
	112: 'f1',
	113: 'f2',
	114: 'f3',
	115: 'f4',
	116: 'f5',
	117: 'f6',
	118: 'f7',
	119: 'f8',
	120: 'f9',
	121: 'f10',
	122: 'f11',
	123: 'f12',
	144: 'num_lock',
	145: 'scroll_lock',
	186: ';',
	187: '=',
	188: ',',
	189: '-',
	190: '.',
	191: '/',
	192: '`',
	219: '[',
	220: '\\',
	221: ']',
	222: '\''
}

HtmlArea.Utils = {
	getPosition: function(elm, relative) {
		var utils = HtmlArea.Utils,
			bound = elm.getBoundingClientRect(),
			html = document.documentElement,
			doc = (!document.compatMode || document.compatMode == 'CSS1Compat') ? html : document.body,
			htmlScroll = { x:window.pageXOffset || doc.scrollLeft, y:window.pageYOffset || doc.scrollTop },
			isFixed = (utils.getComputedStyle(elm, 'position') == 'fixed'),
			position = {
				x:Math.round(bound.left) + ((isFixed) ? 0 : htmlScroll.x) - html.clientLeft,
				y:Math.round(bound.top)  + ((isFixed) ? 0 : htmlScroll.y) - html.clientTop
			};

		if (relative) {
			var rel = utils.getPosition(relative);
			position.x = position.x - rel.x - parseInt(utils.getComputedStyle(relative, 'borderLeftWidth'), 10);
			position.y = position.y - rel.y - parseInt(utils.getComputedStyle(relative, 'borderTopWidth'), 10);
		}
		return position;
	},
	
	getComputedStyle: function(elm, prop) {
		var style = window.getComputedStyle ? window.getComputedStyle(elm, null) : elm.currentStyle;
		return style ? style[prop] : null;
	},

	addClass: document.documentElement.classList ?
		function(elm, cls) { elm.classList.add(cls); } :
		function(elm, cls) { elm.className = ((' '+elm.className+' ').replace(' '+cls+' ', ' ') + ' ' + cls).replace(/^\s+|\s+$/g, ''); },

	removeClass: document.documentElement.classList ?
		function(elm, cls) { elm.classList.remove(cls); } :
		function(elm, cls) { elm.className = (' '+elm.className+' ').replace(' '+cls+' ', ' ').replace(/^\s+|\s+$/g, ''); },

	hasClass: document.documentElement.classList ?
		function(elm, cls) { return elm.classList.contains(cls); } :
		function(elm, cls) { return (' '+elm.className+' ').indexOf(' '+cls+' ') >= 0; },

	contains: (/\{\s*\[native code\]\s*\}/).test('' + document.documentElement.contains) ?
		function(context, node) { return context.contains(node); } :
	(document.documentElement.compareDocumentPosition ?
		function(context, node) { return context === node || !!(context.compareDocumentPosition(node) & 16); } :
		function(context, node) {
			while (node && node !== context) { node = node.parentNode; }
			return (node === context);
		}),

	unwrap: function(node) {
		var parentNode = node.parentNode, child;
		while (child = node.firstChild) {
			parentNode.insertBefore(node.removeChild(child), node);
		}
		parentNode.removeChild(node);
	},

	merge: function() {
		var o = {}, a, aa = arguments.length, p,
			type = Object.prototype.toString, object = '[object Object]';
		for (p in arguments[0]) { o[p] = arguments[0][p]; }
		for (a = 1; a < aa; ++a) {
			for (p in arguments[0]) {
				if (type(o[p]) === object && type(arguments[0][p]) === object) {
					o[p] = HtmlArea.Utils.merge(o[p], arguments[0][p]);
				} else {
					o[p] = arguments[0][p];
				}
			}
		}
		return o;
	},

	format: function(str/*, object... */) {
		var args = arguments;
		return String(str).replace((/\\?\{([^{}]+)\}/g), function(match, name){
			if (match.charAt(0) == '\\') return match.slice(1);
			var a = 1, aa = args.length;
			while (a < aa && ( ! args[a] || args[a][name] == null)) { ++a; }
			return (a < aa) ? args[a][name] : '';
		});
	}
};

HtmlArea.Tools = {
	addTools: function(o) {
		for (var name in o) { this.addTool(name, o[name]); }
		return this;
	},

	addTool: function(name, tool) {
		var Tool = HtmlArea.Tools.Tool;
		tool.tool = name;
		if (typeof tool === 'object' && !(tool instanceof Tool)) {
			tool = new Tool(tool);
		}
		this[name] = tool;
		return this;
	}
};
HtmlArea.Tools.Tool = function(o) { for (var k in o) { this[k] = o[k]; } };
HtmlArea.Tools.Tool.prototype = {
	run: function(editor, btn, e) {
		var cmd = this.command;
		return cmd ? editor.exec(cmd, this.param, this.ui) : false;
	}
};

HtmlArea.Tools.addTools({
	separator:{ text:'|' },

	bold:{ title:'bold', text:'<b>B</b>', command:'bold', key:'b' },
	italic:{ title:'italic', text:'<i>I</i>', command:'italic', key:'i' },
	underline:{ title:'underline', text:'<u>U</u>', command:'underline', key:'u' },
	strike:{ title:'strike', text:'<s>S</s>', command:'strikethrough' },
	sub:{ title:'sub', text:'x<sub>2</sub>', command:'subscript' },
	sup:{ title:'sup', text:'x<sup>2</sup>', command:'superscript' },

	left:{ title:'left', text:'<hr/><hr class="odd"/><hr/><hr class="odd"/><hr/><hr class="odd"/>', command:'justifyLeft' },
	center:{ title:'center', text:'<hr/><hr class="odd"/><hr/><hr class="odd"/><hr/><hr class="odd"/>', command:'justifyCenter' },
	right:{ title:'right', text:'<hr/><hr class="odd"/><hr/><hr class="odd"/><hr/><hr class="odd"/>', command:'justifyRight' },
	justify:{ title:'justify', text:'<hr/><hr/><hr/><hr/><hr/><hr/>', command:'justifyAll' },

	bullet:{ title:'bullet', text:'<ul><li><b>&#9679;</b></li><li><b>&#9679;</b></li><li><b>&#9679;</b></li></ul>', command:'insertunorderedlist' },
	number:{ title:'number', text:'<ol><li><b>1</b></li><li><b>2</b></li><li><b>3</b></li></ol>', command:'insertorderedlist' },
	indent:{ title:'indent', text:'<hr class="full"/><hr/><hr/><hr/><hr/><hr class="full"/><b></b><b></b><b></b>', command:'indent' },
	outdent:{ title:'outdent', text:'<hr class="full"/><hr/><hr/><hr/><hr/><hr class="full"/><b></b><b></b><b></b>', command:'outdent' },
//	rule:{ title:'rule', text:'&mdash;', command:'inserthorizontalrule' }, // I don't think you should do this

//	cut:{ title:'cut', text:'&#9986;', command:'cut', key:'x', magic:true }, // execCommand('cut') doesn't seem to work
//	copy:{ title:'copy', text:'&copy;', command:'copy', key:'c', magic:true }, // execCommand('copy') doesn't seem to work
//	paste:{ title:'paste', text:'P', command:'paste', key:'v', magic:true }, // execCommand('paste') doesn't seem to work
	undo:{ title:'undo', text:'&#8617;', command:'undo', key:'z', magic:true },
	redo:{ title:'redo', text:'&#8618;', command:'redo', key:'y', magic:true },

	mode:{ title:'mode', text:'&lt;/&gt;', key:'/',
		run: function(editor, btn) {
			if (editor.mode === 'visual') {
				HtmlArea.Utils.addClass(btn, 'active');
				editor.setHTMLMode();
			} else {
				HtmlArea.Utils.removeClass(btn, 'active');
				editor.setVisualMode();
			}
		}
	}
});

