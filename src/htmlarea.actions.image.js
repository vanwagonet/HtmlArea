/**
 * Insert images from a url or upload
 *
 * editor options used:
 *  imageAutoLink - (default: false) if true, inserted images are wrapped in a link pointing to the image
 *  imageUploadMax - (default: 6 * 1024 * 1024 [6MB]) max number of bytes allowed in image size
 *  imageUploadURL - (default: /upload.json) url to post image uploads to
 *  imageUploadName - (default: theuploadedfile) field name used for image file uploads
 *  imageUploadSrc - (default: /uploads/{file}) img src for just uploaded files
 *   {file} is replaced with the base name of the file (/path/pic.jpg => pic)
 **/
HtmlArea.Actions.addActions({ image: { title:'Link', text:'<b>&#9731;</b>',
	update: function(editor, btn) {
		var img = this.getImage(editor);
		if (img) { this.show(editor, btn.addClass('active'), img); }
		else { this.hide(editor, btn.removeClass('active')); }
		return img;
	},

	run: function(editor, btn) { this.show(editor, btn, this.getImage(editor)); },

	getImage: function(editor) {
		var node = editor.getRange('node');
		return node && (node.nodeName.toLowerCase() === 'img') && $(node);
	},

	template:
	'<form action="{action}" method="post" enctype="multipart/form-data" encoding="multipart/form-data" accept-charset="utf-8">' +
		'<h6>Add Picture:</h6>' +
		'<label><input type="radio" name="type" value="upload" checked /> From My Computer</label>' +
		'<label><input type="radio" name="type" value="url" /> From the Web</label>' +
		'<label class="upload button choose">' +
			'<span>Choose File</span>' +
			'<input type="file" name="{name}" />' +
		'</label>' +
		'<label class="url">' +
			'<span>Enter URL</span>' +
			'<input type="text" name="url" placeholder="Enter URL" />' +
		'</label>' +
		'<span class="error"></span>' +
		'<input type="submit" class="button" value="Done" />' +
		'<input type="button" class="button" value="Cancel" />' +
	'</form>',

	getUI: function(editor) {
		var ui = editor.element.retrieve('html-editor-image:ui');
		if (!ui) {
			editor.element.store('html-editor-image:ui',
				(ui = new Element('div.html-editor-image.upload', {
					html: this.template.substitute({
						action: editor.options.imageUploadURL || '/upload.json',
						name: editor.options.imageUploadName || 'theuploadedfile'
					})
				})).store('html-editor-image:editor', editor)
			);
			ui.getElement('form').addEvent('submit', this.submit.bind(this, editor));
			ui.getElement('input[type=button]').addEvent('click', this.cancel.bind(this, editor));
			ui.getElements('input[name=type]').addEvent('change', this.typeChange.bind(this, editor));
			ui.getElement('input[type=file]').addEvent('change', this.fileChange.bind(this, editor));
		}
		return ui;
	},

	show: function(editor, btn, img) {
		if (img) { return this.hide(editor, btn); } // TODO: UI for altering img size and position

		var ui = this.getUI(editor);
		ui.getElement('input[type=file]').set('value', '');
		ui.getElement('input[name=url]').set('value', '');
		ui.getElements('input[type=submit],input[type=radio]').set('disabled', false);
		ui.getElement('label.upload').removeClass('progress').removeClass('complete')
			.getElement('span').set('text', 'Choose File');
		ui.addClass('show');
		editor.fireEvent('showImagePanel', { editor:editor, panel:ui, image:img, action:this });
	},

	hide: function(editor) {
		var ui = this.getUI(editor).removeClass('show');
		editor.fireEvent('hideImagePanel', { editor:editor, panel:ui });	
	},

	submit: function(editor, e) {
		e.preventDefault();
		if (!this.validate(editor)) { return; }
		var ui = this.getUI(editor), src,
			type = ui.getElement('input[name=type]:checked').get('value');
		if (type === 'url') { src = ui.getElement('input[name=url]').get('value').trim(); }
		else { src = this.getUploadSrc(editor, ui); }
		if (editor.options.imageAutoLink) { editor.exec('createlink', src); }
		editor.exec('insertimage', src);
	},

	cancel: function(editor, e) {
		e.preventDefault();
		this.hide(editor);
	},

	getUploadSrc: function(editor, ui) {
		var file = ui.getElement('input[type=file]').get('value')
			.split(/[\/\\]/).slice(-1).join('') // basename(file)
			.split('.').slice(0, -1).join('.'); // remove extension
		return (editor.options.imageUploadSrc || '/uploads/{file}')
			.substitute({ file:file });
	},

	typeChange: function(editor, e) {
		var input = $(e.target), type = input.get('value'),
			ui = input.getParent('.html-editor-image');
		if (ui.hasClass(type)) { return; }
		ui.removeClass(type === 'url' ? 'upload' : 'url').addClass(type);
	},

	fileChange: function(editor, e) {
		if (!this.validate(editor)) { return; }
		var ui = this.getUI(editor), url = this.getUploadSrc(editor, ui);
		ui.getElement('label.upload').addClass('progress');
		ui.getElement('input[name=url]').set('value', url);
		ui.getElement('input[type=submit],input[type=radio]').set('disabled', true);
		this.upload(editor, ui, url);
	},

	validate: function(editor) {
		var ui = this.getUI(editor), error,
			type = ui.getElement('input[name=type]:checked').get('value');
		if (type === 'url') {
			// basically just have to have a non-whitespace string
			var url = ui.getElement('input[name=url]').get('value').trim();
			if (!url) { error = 'URL Is Required'; }
		} else {
			var input = ui.getElement('input[type=file]'), file = input.files && input.files[0],
				name = file && file.name || input.get('value').split(/[\/\\]/).slice(-1).join(''),
				size = file && file.size || NaN,
				max = editor.options.imageUploadMax || (6 * 1024 * 1024);

			if (!/\.(jpg|jpeg|png|gif|bmp)$/.test(name)) { error = 'Invalid File Format'; }
			else if (size && size > max) { error = 'Photo Is Too Large'; }
			ui.getElement('label.upload span').set('text', name || 'Choose File');
		}
		ui.getElement('.error').set('text', error || '');
		return !error;
	},

	canXHR2: function() { return window.File && window.FormData && window.XMLHttpRequest && !window.File.prototype.getAsBinary && true || false; },

	upload: function(editor, ui, url) {
		var input = ui.getElement('input[type=file]'), form = ui.getElement('form');
		if (this.canXHR2()) { // upload in ajax request
			var data = new FormData();
			data.append(input.get('name'), input.files[0]);
			data.append('url', url); // send the url we are planning to use

			var xhr = new XMLHttpRequest(),
				success = this.success.bind(this, editor, ui, xhr),
				failure = this.failure.bind(this, editor, ui, xhr);
			xhr.addEventListener('load', success, false);
			xhr.addEventListener('error', failure, false);
			xhr.addEventListener('abort', failure, false);
			xhr.open('POST', form.get('action'), true);
			xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
			xhr.send(data);
		} else { // post to hidden iframe
			var iframe = new Element('iframe', { name:this.getIframeId(), src:'javascript:""' }).inject(form, 'after'),
				success = this.success.bind(this, editor, ui),
				failure = this.failure.bind(this, editor, ui),
				iframeReadyStateChange = this.iframeReadyStateChange.bind(this, editor, ui, iframe);
			iframe.addEvents({ error:failure, abort:failure, load:iframeReadyStateChange, readystatechange:iframeReadyStateChange });
			form.set('target', iframe.name).submit();
		}
	},

	getIframeId: (function() {
		return 'htmlarea_image_iframe_' + (++this.counter);
	}).bind({ counter:0 }),

	iframeReadyStateChange: function(editor, ui, iframe, e) {
		if (iframe.readyState && iframe.readyState !== 'loaded' && iframe.readyState !== 'complete') { return; }
		var response = iframe.contentWindow.document.body;
		response = JSON.decode(response.textContent || response.innerText);
		iframe.destroy();
		this.success(editor, ui, null, response);
	},

	success: function(editor, ui, xhr, response) {
		if (xhr) { response = JSON.decode(xhr.responseText); }
		if (response && response.error) { return this.failure(editor, ui, response.error ); }

		ui.getElement('label.upload').removeClass('progress').addClass('complete');
		ui.getElements('input[type=submit],input[type=radio]').set('disabled', false);
	},

	failure: function(editor, ui, e) {
		var msg = e || 'The File Upload Failed';
		ui.getElement('label.upload').removeClass('progress');
		ui.getElements('input[type=submit],input[type=radio]').set('disabled', false);
		ui.getElement('.error').set('text', msg);
	},
} });
