/**
 * Insert videos from a url or embed code
 **/
HtmlArea.Tools.Video = function(editor, o, s) {
	this.editor = editor;
	this.options = HtmlArea.Utils.merge(this.options, o);
	this.strings = HtmlArea.Utils.merge(this.strings, s);
	this.setupEvents(this.options);
	editor.on('modechange', this.bind(this.hide));
};
HtmlArea.Tools.Video.prototype = HtmlArea.Events({
	template:
	'<form action="" method="post">' +
		'<h6>' +
			'<span>{title}</span>' +
		'</h6>' +
		'<label class="url">' +
			'<span>{label}</span>' +
			'<input type="text" name="url" placeholder="{placeholder}" />' +
		'</label>' +
		'<p>{explain}</p>' +
		'<div class="error"></div>' +
		'<input type="submit" class="button" value="{done}" disabled />' +
		'<input type="button" class="button" value="{cancel}" />' +
	'</form>',

	strings: {
		title: 'Add Video:',
		label: 'Enter URL or Embed Code',
		placeholder: 'Enter URL or Embed Code',
		explain: 'Accepts videos from YouTube and Vimeo',
		done: 'Done',
		cancel: 'Cancel'
	},

	getUI: function() {
		if (this.ui) { return this.ui; }
		var ui = (this.ui = document.createElement('div')),
			editor = this.editor, validate = this.bindEvent(this.validate);
		ui.className = 'htmlarea-video';
		ui.innerHTML = HtmlArea.Utils.format(this.template, this.options, this.strings, this);
		this.on(ui.firstChild, 'submit', this.submit);
		this.on(ui.querySelector('input[type=button]'), 'click', this.cancel);
		this.ons(ui.querySelector('input[name=url]'), { keydown:validate, input:validate, change:validate }, true);
		editor.fire('buildVideoPanel', { editor:editor, panel:ui, tool:this });
		return ui;
	},

	show: function() {
		var ui = this.getUI(), editor = this.editor;
		this.range = editor.getRange();
		ui.querySelector('input[name=url]').value = '';
		ui.querySelector('input[type=submit]').disabled = true;
		editor.element.appendChild(ui);
		editor.fire('showVideoPanel', { editor:editor, panel:ui, tool:this });
	},

	hide: function() {
		var ui = this.getUI(), parent = ui.parentNode;
		if (parent) { parent.removeChild(ui); }
		this.editor.fire('hideVideoPanel', {
			editor:this.editor, panel:ui, tool:this
		});
	},

	submit: function(e) {
		if (this.validate()) {
			var ui = this.getUI(), input = ui.querySelector('input[name=url]'),
				src = input.value.replace(/^\s+|\s+$/g, '');
			this.insert(this.getHtmlFor(src));
			this.hide();
		}
		e.preventDefault(); // don't submit the form
		return false;
	},

	cancel: function(e) {
		this.hide();
		e.preventDefault();
		return false;
	},

	validate: function(e) {
		var ui = this.getUI(), error, input = ui.querySelector('input[name=url]'),
			url = input.value.replace(/^\s+|\s+$/g, '');
		if (!url) { error = 'URL or Embed Code Is Required'; }
		else if (!this.getHtmlFor(url)) { error = 'Invalid Format'; }
		ui.querySelector('.error').innerHTML = error || '';
		ui.querySelector('input[type=submit]').disabled = !!error;
		return e ? true : !error;
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
});


/**
 * Tool interface
 **/
HtmlArea.Tools.Video.title = 'Add Video';
HtmlArea.Tools.Video.text = 'You<em>Tube</em>';
HtmlArea.Tools.Video.setup = function(e) { if (!e.videoTool) { e.videoTool = new HtmlArea.Tools.Video(e); } };
HtmlArea.Tools.Video.run = function(editor) { editor.videoTool.show(); };

HtmlArea.Tools.addTool('video', HtmlArea.Tools.Video);

