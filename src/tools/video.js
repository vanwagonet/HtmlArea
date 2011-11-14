/**
 * Insert videos from a url or embed code
 **/
HtmlArea.Tools.Video = new Class({

	Implements: [ Events, Options ],

	options: {},

	initialize: function(editor, o) {
		this.editor = editor;
		this.setOptions(o);
		editor.addEvent('modechange', this.hide.bind(this));
	},

	template:
	'<form action="{action}" method="post">' +
		'<h6>' +
			'<span>Add Video:</span>' +
		'</h6>' +
		'<label class="url">' +
			'<span>Enter URL or Embed Code</span>' +
			'<input type="text" name="url" placeholder="Enter URL or Embed Code" />' +
		'</label>' +
		'<p>Accepts videos from YouTube and Vimeo</p>' +
		'<div class="error"></div>' +
		'<input type="submit" class="button" value="Done" disabled />' +
		'<input type="button" class="button" value="Cancel" />' +
	'</form>',

	getUI: function() {
		if (this.ui) { return this.ui; }
		var ui = (this.ui = new Element('div.htmlarea-video', {
			html: this.template.substitute(this.options)
		})), editor = this.editor;
		ui.getElement('form').addEvent('submit', this.submit.bind(this));
		ui.getElement('input[type=button]').addEvent('click', this.cancel.bind(this));
		ui.getElement('input[name=url]').addEvent('input', this.validate.bind(this));
		editor.fireEvent('buildVideoPanel', { editor:editor, panel:ui, tool:this });
		return ui;
	},

	show: function() {
		var ui = this.getUI(), editor = this.editor;
		this.range = editor.getRange();
		ui.getElement('input[name=url]').set('value', '');
		ui.getElements('input[type=submit]').set('disabled', true);
		ui.inject(editor.element);
		editor.fireEvent('showVideoPanel', { editor:editor, panel:ui, tool:this });
	},

	hide: function() {
		this.editor.fireEvent('hideVideoPanel', {
			editor:this.editor, panel:this.getUI().dispose(), tool:this
		});
	},

	submit: function(e) {
		e.preventDefault();
		if (!this.validate(e)) { return; }
		var ui = this.getUI(),
			src = ui.getElement('input[name=url]').get('value').trim();
		this.insert(this.getHtmlFor(src));
		this.hide();
	},

	cancel: function(e) {
		e.preventDefault();
		this.hide();
	},

	validate: function(e) {
		var ui = this.getUI(), error,
			url = ui.getElement('input[name=url]').get('value').trim();
		if (!url) { error = 'URL or Embed Code Is Required'; }
		else if (!this.getHtmlFor(url)) { error = 'Invalid Format'; }
		ui.getElement('.error').set('text', error || '');
		ui.getElement('input[type=submit]').set('disabled', !!error);
		return !error;
	},

	insert: function(html) {
		this.editor.setRange(this.range);
		this.editor.insert(html);
		try { this.editor.exec('enableObjectResizing', false); } catch(err) {} // disable UA resizing
	},

	getHtmlFor: function(url) {
		var formats = this.formats, f, ff, format;
		for (f = 0, ff = formats.length; f < ff; ++f) {
			format = formats[f];
			if (format.test.test(url)) {
				return url.replace(format.test, format.html);
			}
		}
		return false;
	},

	formats: [
		{
			name: 'YouTube',
			test: /^\s*(<iframe\b[^>]+?\bsrc="https?:\/\/www\.youtube(?:\-nocookie)?\.com\/embed\/[^?\/\\]+)(?:\?([^"]+))?([^>]*><\/iframe>)\s*$/i,
			html: '$1?wmode=transparent&$2$3'
		}, {
			name: 'YouTube',
			test: /^\s*(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*?\bv=([^&]+).*$/i,
			html: '<iframe src="//www.youtube.com/embed/$1?wmode=transparent" style="width:320px;height:240px" frameborder="0" allowfullscreen></iframe>'
		}, {
			name: 'YouTube',
			test: /^\s*(?:https?:\/\/)?(?:www\.)?youtube\.com\/[^#]*#(?:\w+\/)*(.*)$/i,
			html: '<iframe src="//www.youtube.com/embed/$1?wmode=transparent" style="width:320px;height:240px" frameborder="0" allowfullscreen></iframe>'
		}, {
			name: 'YouTube',
			test: /^\s*(?:https?:\/\/)?(?:www\.)?youtu.be\/([^?\/\\]+).*$/i,
			html: '<iframe src="//www.youtube.com/embed/$1?wmode=transparent" style="width:320px;height:240px" frameborder="0" allowfullscreen></iframe>'
		}, {
			name: 'Vimeo',
			test: /^\s*(<iframe\b[^>]+?\bsrc="https?:\/\/player\.vimeo\.com\/video\/\d+[^>]*><\/iframe>)(<p>.*?<\/p>)?\s*$/i,
			html: '$1$2'
		}, {
			name: 'Vimeo',
			test: /^\s*(?:http:\/\/)vimeo\.com\/(\d+)\s*$/i,
			html: '<iframe src="//player.vimeo.com/video/$1" style="width:320px;height:240px" frameborder="0" allowFullScreen></iframe>'
		}
	]

}).extend({ // static


	/**
	 * Tool interface
	 **/
	title:'Add Video', text:'You<em>Tube</em>',

	setup: function(editor) {
		if (!editor.videoTool) { editor.videoTool = new this(editor); }
	},

	run: function(editor) { editor.videoTool.show(); }
});

HtmlArea.Tools.addTool('video', HtmlArea.Tools.Video);
