/**
 * A simple but extensible rich text editor
 **/
HtmlArea = new Class({
	Implements: [ Events, Options ],
	options: {
		name: 'content',
		style: 'default',
		mode: 'visual',
		toolsgo: 'top',
		tools: [
			[ 'bold', 'italic', 'underline', 'strike', 'sub', 'sup' ],
			[ 'left', 'center', 'right', ],
			[ 'bullet', 'number', 'indent', 'outdent' ],
			'mode'
		]
	},

	initialize: function(content, o) {
		this.setOptions(o);
		o = this.options;

		this.content = (content = $(content) || new Element('div'));
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
		this.exec('styleWithCSS', false); // prefer tags to styles
		if (Browser.firefox) { content.innerHTML += HtmlArea.pbrp; }

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
		this.content.set('html', this.textarea.get('value').replace(/\u00a0/g, '<br/>'));
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
		var a = $(e.target), action;
		if (a.get('tag') === 'span') { a = a.getParent(); }
		action = HtmlArea.Actions[a.get('data-action')];
		if (action) { action.run(this, a, e); }
		e.preventDefault(); // prevent losing focus
	},

	shortcut: function(e) {
		if (e && e.key === 'enter') {
			if (Browser.ie) { e.preventDefault(); this.insert('<br/>'); }
		} else if (!e || !(e.control || e.meta)) { return; }

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
		if (type === 'support') { return document.queryCommandSupported(cmd); }
		if (type === 'value') { return document.queryCommandValue(cmd); }
		return document.queryCommandIndeterm(cmd) ? undefined :
			document.queryCommandState(cmd);
	},

	insert: function(html) {
		if (document.selection && document.selection.createRange) {
			document.selection.createRange().pasteHTML(html);
		} else { this.exec('insertHTML', html); }
	},

	beforeGetHTML: function() {
		var pbrp = this.content.getElements('.p-br-p').dispose();
		this.content.getElements('p:empty,div:empty,span:empty').destroy();
		return { pbrp:pbrp };
	},

	cleanHTML: function(html) {
		var options = this.options.cleanOptions || {},
			cleanups = HtmlArea.cleanups,
			cleaned, c, cc = cleanups.length,
			replace = html.replace;

		do { for (c = 0, cleaned = html; c < cc; ++c) {
			html = replace.apply(html, cleanups[c]);
		} } while (cleaned != html);

		return html.trim();
	},

	afterGetHTML: function(pre) {
		if (pre && pre.pbrp) { this.content.adopt(pre.pbrp); }
	},

	getHTML: function() {
		var pre = this.beforeGetHTML(),
			html = this.cleanHTML(this.content.get('html'));
		this.afterGetHTML(pre);
		return html;
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

	pbrp: '<p class="p-br-p" style="display:none"><br/></p>',

	// got a lot of these from MooRTE. Thanks Sam!
	cleanups: [
		// html tidiness
		[ /<[^> ]*/g, function(m) { return m.toLowerCase(); } ], // lowercase tags
		[ /<[^>]*>/g, function(m) {	return m
			.replace(/ [^=]+=/g, function(a) { return a.toLowerCase(); }) // lowercase attributes
			.replace(/( [^=]+=)([^"][^ >]*)/g, '$1"$2"'); // quote attributes
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
		[ /<span>([^<]*?)<\/span>/g, '$1' ], // remove spans with no attributes

		[ /<p>\s*<br\/>\s*<\/p>|<p>(?:&nbsp;|\s)*<\/p>/g, '<p>\u00a0</p>' ], // replace padded <p> with non-breaking space

		// semantic changes, but prefer b, and i instead of strong and em
		[ /<li>\s*<div>(.+?)<\/div>\s*<\/li>/g, '<li>$1</li>' ], // no root <div> in <li>
		[ /<span style="font-weight: bold;">([^<]*?)<\/span>/gi, '<b>$1</b>' ], // use <b> for bold
		[ /<span style="font-style: italic;">([^<]*?)<\/span>/gi, '<i>$1</i>' ], // use <i> for italic
		[ /<span style="text-decoration: underline;">([^<]*?)<\/span>/gi, '<u>$1</u>' ], // use <u> for underline (http://dev.w3.org/html5/spec/Overview.html#the-u-element)
		[ /<span style="text-decoration: line-through;">([^<]*?)<\/span>/gi, '<s>$1</s>' ], // use <s> for strikethrough (http://dev.w3.org/html5/spec/Overview.html#the-s-element)
		[ /<strong\b[^>]*>(.*?)<\/strong[^>]*>/g, '<b>$1</b>' ], // use <b> for bold
		[ /<em\b[^>]*>(.*?)<\/em[^>]*>/g, '<i>$1</i>' ], // use <i> for italic

		// normalize whitespace
		[ /<p>\s*(<img[^>]+>)\s*<\/p>/g, '$1\n' ], // <p> with only <img>, unwrap	
		[ /<\/(p|ol|ul)>\s*/gm, '</$1>\n' ], // newline after </p> </ol> </ul>
		[ /><li>/g, '>\n\t<li>' ], // indent <li>
		[ /\s*<\/(ol|ul)>/gm, '\n</$2>'], // newline before </ol> </ul>
		[ /\s*<img\b([^>*?])>\s*/gm, '\n<img$1>\n'], // <img> on its own line
		[ /^\s*$/g, '' ] // no empty lines
	]
});


HtmlArea.Actions.addActions({
	bold:{ title:'Bold', text:'B', command:'bold', key:'b' },
	italic:{ title:'Italic', text:'I', command:'italic', key:'i' },
	underline:{ title:'Underline', text:'U', command:'underline', key:'u' },
	strike:{ title:'Strikethrough', text:'S', command:'strikethrough' },
	sub:{ title:'Subscript', text:'s', command:'subscript' },
	sup:{ title:'Superscript', text:'s', command:'superscript' },

	left:{ title:'Align Left', command:'justifyLeft' },
	center:{ title:'Align Center', command:'justifyCenter' },
	right:{ title:'Align Right', command:'justifyRight' },
//	justify:{ title:'Justify', command:'justifyAll' }, // doesn't seem to work, even though querying says supported

	bullet:{ title:'Bullet List', text:'&#8226;', command:'insertunorderedlist' },
	number:{ title:'Numbered List', text:'1', command:'insertorderedlist' },
	indent:{ title:'Increase Indent', text:'&#8614;', command:'indent' },
	outdent:{ title:'Decrease Indent', text:'&#8612;', command:'outdent' },
	rule:{ title:'Horizontal Rule', text:'&mdash;', command:'inserthorizontalrule' },

	cut:{ title:'Cut', text:'&#9986;', command:'cut', key:'x', magic:true },
	copy:{ title:'Copy', text:'C', command:'copy', key:'c', magic:true },
	paste:{ title:'Paste', text:'P', command:'paste', key:'v', magic:true },
	undo:{ title:'Undo', text:'&#8617;', command:'undo', key:'z', magic:true },
	redo:{ title:'Redo', text:'&#8618;', command:'redo', key:'y', magic:true },

	separator:{ text:'|' },
	'|':{ text:'|' },

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
