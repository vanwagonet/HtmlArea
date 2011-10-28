/**
 * A simple but extensible rich-text editor
 * copyright 2011 - Andy VanWagoner
 * license: MIT
 **/
HtmlArea = new Class({
	Implements: [ Events, Options ],
	options: {
		name: 'content',
		style: 'default',
		mode: 'visual',
		toolsgo: 'top',
		tools: '[bold,italic,underline,strike]|[sub,sup|left,center,right]|[bullet,number,indent,outdent]|[link,mode]'
	},

	initialize: function(content, o) {
		this.setOptions(o);
		o = this.options;
		if (typeOf(o.tools) === 'string') {
			o.tools = '"' + o.tools.split('|').join(',|,').split(',').join('","') + '"';
			o.tools = '[' + o.tools.replace(/"\[/g, '["').replace(/\]"/g, '"]') + ']';
			o.tools = JSON.decode(o.tools);
		}

		this.content = (content = $(content) || new Element('div', { html:o.value||'' }));
		this.element = new Element('div');
		if (content.parentNode) { this.element.wraps(content); }
		else { this.element.grab(content); }

		if (content.get('tag') === 'textarea') {
			var ta = (this.textarea = content);
			content = (this.content = new Element('div'))
				.set('class', ta.get('class'))
				.set('html', ta.get('value'))
				.inject(ta.setStyle('display', 'none'), 'before');
		} else {
			this.textarea = new Element('textarea')
				.set('name', o.name)
				.set('class', content.get('class'))
				.set('value', this.getHTML())
				.setStyle('display', 'none').inject(content, 'after');
		}
		this.element.addClass('html-editor').addClass(o.style);
		content.addClass('content').set('contentEditable', true);
		if (this.query('styleWithCSS', 'support')) { this.exec('styleWithCSS', false); } // prefer tags to styles
		if (!content.innerHTML.trim()) { content.innerHTML += HtmlArea.pbrp; }

		if (o.mode === 'html') { this.setHTMLMode(); }
		else { this.mode = 'visual'; }

		var bar = (this.tools = new Element('div'))
			.set('html', this.buildTools(o.tools))
			.addClass('tools').addClass(o.style);
		if (o.toolsgo === 'top') { bar.inject(this.element, 'top'); }
		else { bar.inject(this.element, 'bottom'); }

		return this.addListeners();
	},

	buildTools: function(tools) {
		var Actions = HtmlArea.Actions, html = '', t, tt, action,
			cmd = (navigator.platform.indexOf('Mac') === 0) ? '&#8984;' : 'ctrl ';
		for (t = 0, tt = tools.length - 1; t <= tt; ++t) {
			if (tools[t] === '|') { tools[t] = 'separator'; }
			if (typeOf(tools[t]) === 'array') {
				html += '<div class="tools">' + this.buildTools(tools[t]) + '</div>';
			} else if (action = Actions[tools[t]]) {
				html += '<a data-action="' + tools[t] + '" class="' + tools[t];
				if (!t) { html += ' first'; }
				if (t === tt) { html += ' last'; }

				html += '" title="' + (action.title || '');
				if (action.key) { html += ' ' + cmd + action.key.toUpperCase(); }

				html += '"><span>' + (action.text || tools[t]) + '</span></a>';
			}
		}
		return html;
	},

	addListeners: function() {
		var updateTools = this.updateTools.bind(this);
		this.content.addEvents({
			blur: this.updateTextarea.bind(this),
			keydown: this.shortcut.bind(this),
			focus:updateTools, keyup:updateTools, mouseup:updateTools
		});
		this.tools.addEvents({
			mousedown: this.toolRun.bind(this),
			mouseup: updateTools
		});
		return this;
	},

	updateTextarea: function() {
		this.textarea.set('value', this.getHTML());
	},

	updateContent: function() {
		this.content.set('html', this.textarea.get('value'));
		if (Browser.firefox) { this.content.innerHTML += HtmlArea.pbrp; }
	},

	updateTools: function(e) {
		var map = this.updateTools.toolMap, btn, state, cmd,
			Actions = HtmlArea.Actions, action, name;

		if (!map) {
			map = (this.updateTools.toolMap = {});
			this.updateToolMap(map, this.options.tools);
		}
		for (name in map) {
			if ((action = Actions[name]).update) {
				action.update(this, map[name], e);
			} else if (cmd = action.getCommand()) {
				btn = map[name];
				state = this.query(cmd);
				if (state === false) { btn.removeClass('active').removeClass('indeterminate'); }
				else if (state) { btn.addClass('active').removeClass('indeterminate'); }
				else { btn.removeClass('active').addClass('indeterminate'); }
			}
		}
	},

	updateToolMap: function(map, tools) {
		var t, tt = tools.length, bar = this.tools,
			Actions = HtmlArea.Actions, action;
		for (t = 0; t < tt; ++t) {
			if (typeOf(tools[t]) === 'array') {
				this.updateToolMap(map, tools[t]);
			} else if (action = Actions[tools[t]]) {
				if (action.update || action.getCommand()) { // only stateful tools
					map[tools[t]] = bar.getElement('.' + tools[t]);
				}
			}
		}
	},

	setHTMLMode: function() {
		var height = this.content.getStyles('height').height;
		this.element.addClass('html-mode');
		this.updateTextarea();
		this.content.setStyle('display', 'none');
		this.textarea.setStyles({ display:'', height:height });
		this.mode = 'html';
	},

	setVisualMode: function() {
		this.element.removeClass('html-mode');
		this.updateContent();
		this.textarea.setStyle('display', 'none');
		this.content.setStyle('display', '');
		this.mode = 'visual';
	},

	toolRun: function(e) {
		e.preventDefault(); // prevent losing focus
		var a = $(e.target), action;
		if (!a.get('data-action')) { a = a.getParent('[data-action]'); }
		if (!a) { return; }
		action = HtmlArea.Actions[a.get('data-action')];
		if (action) { action.run(this, a, e); }
	},

	shortcut: function(e) {
		if (!e || !(e.control || e.meta)) { return; }

		var keys = this.shortcut.keys, Actions = HtmlArea.Actions, t;
		if (!keys) {
			keys = (this.shortcut.keys = {});
			for (t in Actions) {
				if (Actions[t].key && !Actions[t].magic) {
					keys[Actions[t].key] = Actions[t];
				}
			}
		}
		if (t = keys[e.key]) {
			var a = this.tools.getElement('.' + t.name);
			t.run(this, a, e);
		}
	},

	exec: function(cmd, val, ui) {
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

	unwrap: function(node) {
		var parentNode = node.parentNode, child;
		while (child = node.firstChild) {
			parentNode.insertBefore(node.removeChild(child), node);
		}
		$(node).destroy();
	},

	beforeGetHTML: function() {
		var spans = this.content.getElements('span,[style]').include(this.content),
			styles = HtmlArea.styles, s, ss = styles.length,
			style, span, t, tt = spans.length;
		for (t = 0; t < tt; ++t) {
			style = (span = spans[t]).get('style').trim();
			if (style) {
				for (s = 0; s < ss; ++s) {
					if (!styles[s][0].test(style)) { continue; }
					style = style.replace(styles[s][0], styles[s][1]);
					if (styles[s][2]) {
						span.innerHTML = '<' + styles[s][2] + '>'
							+ span.innerHTML + '</' + styles[s][2] + '>';
					}
				}
				span.set('style', (style = style.trim()));
			}
			if (!style && span != this.content && span.get('tag') === 'span') {
				this.unwrap(span);
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

		return html.trim();
	},

	getHTML: function() {
		this.beforeGetHTML(); 
		return this.cleanHTML(this.content.get('html'));
	},

	getRange: function(type) {
		var sel = window.getSelection ? window.getSelection() : document.selection,
			range = (sel.rangeCount && sel.getRangeAt && sel.getRangeAt(0)) || (sel.createRange && sel.createRange());
		if (type === 'text') { return range && (range.text || range.toString()) || ''; }
		if (type === 'node') { return range && (range.commonAncestorContainer || range.parentElement()) || null; }
		return range;
	}

}).extend({ // static

	Actions: {
		Action: new Class({
			initialize: function(o) {
				for (var k in o) { this[k] = o[k]; }
			},

			getCommand: function() { return this.command },
			getParam: function() { return this.param; },
			getUI: function() { return this.ui; },

			run: function(editor, btn, evt) {
				evt.preventDefault();
				var cmd = this.getCommand();
				return cmd ? editor.exec(cmd, this.getParam(), this.getUI()) : false;
			}
		}),

		addActions: function(o) {
			var Action = HtmlArea.Actions.Action;
			for (var name in o) {
				if (name === 'Action' || name === 'addActions') { continue; }
				if (!o.command || document.queryCommandSupported(o.command)) {
					this[o[name].name = name] = new Action(o[name]);
				}
			}
			return this;
		}
	},

	pbrp: '<p><br/></p>',

	// got this started by looking at MooRTE. Thanks Sam!
	cleanups: [
		// html tidiness
		[ /<[^> ]*/g, function(m) { return m.toLowerCase(); } ], // lowercase tags
		[ /<[^>]*>/g, function(m) {	return m
			.replace(/ [^=]+=/g, function(a) { return a.toLowerCase(); }) // lowercase attributes
			.replace(/( [^=]+=)([^"][^ >]*)/g, '$1"$2"') // quote attributes
			.replace(/ slick-uniqueid="[^"]*"/g, ''); // remove slick added attributes
		} ],
		[ /(<(?:img|input)[^\/>]*)>/g, '$1 />' ], // self close tags

		// <br/> tag cleanup
		[ /<br\b[^>]*?>/g, '<br/>' ], // normalize <br>
		[ /><br\/>/g, '>' ], // no <br> directly after something else
		[ /^<br\/>|<br\/>$/g, '' ], // no leading or trailing <br>
		[ /<br\/>\s*<\/(h1|h2|h3|h4|h5|h6|li|p|div)/g, '</$1' ], // no <br> at end of block

		// webkit cleanup
		[ / class="apple-style-span"| style=""/gi, '' ], // remove unhelpful attributes	
		[ /^([^<]+)(<?)/, '<p>$1</p>$2' ], // wrap first text in <p>
		[ /<(\/?)div\b/g, '<$1p' ], // change <div> to <p>

		[ /<p>\s*<br\/>\s*<\/p>|<p>(?:&nbsp;|\s)*<\/p>/g, '<p>\u00a0</p>' ], // replace padded <p> with non-breaking space

		// semantic changes, but prefer b, i, and s instead of strong, em, and del
		[ /<(\/?)strong\b/g, '<$1b' ], // use <b> for bold
		[ /<(\/?)em\b/g, '<$1i' ], // use <i> for italic
		[ /<(\/?)(?:strike|del)\b/g, '<$1s' ], // use <s> for strikethrough
	// Done in DOM do prevent mismatching end tags, or only matching leaf nodes
	//	[ /<span style="font-weight: bold;">([^<]*?)<\/span>/gi, '<b>$1</b>' ], // use <b> for bold
	//	[ /<span style="font-style: italic;">([^<]*?)<\/span>/gi, '<i>$1</i>' ], // use <i> for italic
	//	[ /<span style="text-decoration: underline;">([^<]*?)<\/span>/gi, '<u>$1</u>' ], // use <u> for underline (http://dev.w3.org/html5/spec/Overview.html#the-u-element)
	//	[ /<span style="text-decoration: line-through;">([^<]*?)<\/span>/gi, '<s>$1</s>' ], // use <s> for strikethrough (http://dev.w3.org/html5/spec/Overview.html#the-s-element)

		// normalize whitespace, tag placement
		[ /<p>\s*(<img[^>]+>)\s*<\/p>/g, '$1' ], // <p> with only <img>, unwrap
		[ /\s*<(\/?(?:p|ol|ul)\b[^>]*)>\s*/g, '<$1>\n' ], // newline after <p> </p> <ol> </ol> <ul> </ul>
		[ /\s*<li([^>]*)>/g, '\n\t<li$1>' ], // indent <li>
		[ /\s*<\/(p|ol|ul)>/g, '\n</$1>'], // newline before </p> </ol> </ul>
		[ /\s*<img\b([^>*?])>\s*/g, '\n<img$1>\n'], // <img> on its own line
		[ /<p\b[^>]*>\s*<\/p>\s*<(ol|ul)\b/g, '<$1' ], // remove empty <p> before <ul> or <ol>
		[ /(<p\b[^>]*>\s*)(<(ul|ol)\b([^<]|<)*?<\/\3>\s*)/g, '$2$1' ], // move <p> right before <ul> or <ol> to after
		[ /^\s*$/g, '' ] // no empty lines
	],

	styles: [
		[ /(text-decoration:.*?)\bline-through\b(;?)/g, '$1$2', 's' ],
		[ /(text-decoration:.*?)\bunderline\b(;?)/g, '$1$2', 'u' ],
		[ /text-decoration:\s*;/, '' ],
		[ /font-style:\s*italic;?/g, '', 'i' ],
		[ /font-weight:\s*bold;?/g, '', 'b' ]
	]
});


HtmlArea.Actions.addActions({
	bold:{ title:'Bold', text:'<b>B</b>', command:'bold', key:'b' },
	italic:{ title:'Italic', text:'<i>I</i>', command:'italic', key:'i' },
	underline:{ title:'Underline', text:'<u>U</u>', command:'underline', key:'u' },
	strike:{ title:'Strikethrough', text:'<s>S</s>', command:'strikethrough' },
	sub:{ title:'Subscript', text:'x<sub>2</sub>', command:'subscript' },
	sup:{ title:'Superscript', text:'x&#x00B2;', command:'superscript' },

	left:{ title:'Align Left', text:'<ul><li>&ndash;&ndash;</li><li>&ndash;</li><li>&ndash;&ndash;</li></ul>', command:'justifyLeft' },
	center:{ title:'Align Center', text:'<ul><li>&ndash;</li><li>&ndash;&ndash;</li><li>&ndash;</li></ul>', command:'justifyCenter' },
	right:{ title:'Align Right', text:'<ul><li>&ndash;&ndash;</li><li>&ndash;</li><li>&ndash;&ndash;</li></ul>', command:'justifyRight' },
//	justify:{ title:'Justify', text:'J', command:'justifyAll' }, // doesn't seem to work, even though querying says supported

	bullet:{ title:'Bullet List', text:'<ul><li>&mdash;</li><li>&mdash;</li><li>&mdash;</li></ul>', command:'insertunorderedlist' },
	number:{ title:'Numbered List', text:'<ol><li>&mdash;</li><li>&mdash;</li><li>&mdash;</li></ol>', command:'insertorderedlist' },
	indent:{ title:'Increase Indent', text:'&#8614;', command:'indent' },
	outdent:{ title:'Decrease Indent', text:'&#8612;', command:'outdent' },
//	rule:{ title:'Horizontal Rule', text:'&mdash;', command:'inserthorizontalrule' }, // I don't think you should do this

	cut:{ title:'Cut', text:'&#9986;', command:'cut', key:'x', magic:true },
	copy:{ title:'Copy', text:'&copy;', command:'copy', key:'c', magic:true },
	paste:{ title:'Paste', text:'P', command:'paste', key:'v', magic:true },
	undo:{ title:'Undo', text:'&#8617;', command:'undo', key:'z', magic:true },
	redo:{ title:'Redo', text:'&#8618;', command:'redo', key:'y', magic:true },

	separator:{ text:'|' },

	mode:{ title:'View HTML', text:'&lt;/&gt;', key:'0',
		run: function(editor, btn) {
			if (editor.mode === 'visual') {
				btn.addClass('active');
				editor.setHTMLMode();
			} else {
				btn.removeClass('active');
				editor.setVisualMode();
			}
		}
	},


	/**
	 * Create, update, and remove links
	 **/
	link:{ title:'Link', text:'<b>&#9741;</b>',
		update: function(editor, btn) {
			var link = this.getLink(editor);
			if (link) {
				this.show(editor, btn.addClass('active').removeClass('indeterminate'));
			} else {
				this.hide(editor, btn.removeClass('active').removeClass('indeterminate'));
			}
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
			var ui = editor.element.retrieve('html-editor-link:ui');
			if (!ui) {
				editor.element.store('html-editor-link:ui',
					(ui = new Element('div.html-editor-link', {
						html: '<input type="text" name="url" placeholder="Enter URL" />'
							+ '<a><span>&times;</span></a>'
					}).store('html-editor-link:editor', editor)
					.addEvent('mousedown', this.uiMousedown).inject(editor.element))
				);
				ui.store('html-editor-link:action', this).getFirst('input')
					.addEvents({ focus:this.urlFocus, blur:this.urlBlur });
			}
			return ui;
		},

		show: function(editor, btn, url) {
			var ui = this.getUI(editor), link = this.getLink(editor);
			url = url || (link && link.get('href')) || 'http://';
			ui.getFirst('input').set('value', url);
			ui.addClass('show');
		},

		hide: function(editor) {
			var ui = this.getUI(editor);
			ui.removeClass('show');
		},

		urlFocus: function(e) {
			$(e.target).getParent('.html-editor-link').addClass('focus');
		},

		urlBlur: function(e) {
			var input = $(e.target),
				ui = input.getParent('.html-editor-link').removeClass('focus'),
				editor = ui.retrieve('html-editor-link:editor');
			editor.content.focus();
			ui.retrieve('html-editor-link:action').getLink(editor).href = input.value;
		},

		uiMousedown: function(e) {
			var target = $(e.target), ui, editor, action, link;
			if (target.get('tag') === 'input') { return; }
			if (target.get('tag') === 'span') { target = target.getParent(); }
			if (target.get('tag') === 'a') {
				ui = target.getParent('.html-editor-link');
				editor = ui.retrieve('html-editor-link:editor');
				action = ui.retrieve('html-editor-link:action');
				link = action.getLink(editor);
				if (link) {
					link.getChildren('u').each(editor.unwrap);
					editor.unwrap(link);
				}
				action.hide(editor);
			}
			e.preventDefault(); // don't change focus
		}
	}
});
/* TODO:
link
image
code
removeformat
font
fontsize
style
forecolor
backcolor
charmap
blockquote
*/
