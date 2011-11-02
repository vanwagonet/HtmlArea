/**
 * Insert images from a url or upload
 *
 * editor options used:
 *  imageAutoLink - (default: false) if true, inserted images are wrapped in a link pointing to the image
 *  imageUploadMax - (default: 6 * 1024 * 1024 [6MB]) max number of bytes allowed in image size
 *  imageUploadURL - (default: /upload.json) url to post image uploads to
 *  imageUploadName - (default: file) field name used for image file uploads
 *  imageUploadSrc - (default: /uploads/{file}) img src for just uploaded files
 *   {file} is replaced with the base name of the file (/path/pic.jpg => pic.jpg)
 *   {name} is replaced with the base name of the file (/path/pic.jpg => pic)
 *   {ext} is replaced with the base name of the file (/path/pic.jpg => jpg)
 **/
HtmlArea.Actions.addActions({ image: { title:'Add Picture', text:'<b>&#9679;</b><span>&#9728;</span>',

	added: function(editor) {
		editor.content.addEvent('mouseover', this.imgMouseOver.bind(this, editor));
	},

	run: function(editor, btn) { this.show(editor, btn); },

	template:
	'<form action="{action}" method="post" enctype="multipart/form-data" encoding="multipart/form-data" accept-charset="utf-8">' +
		'<h6>' +
			'<span>Add Picture:</span>' +
			'<label><input type="radio" name="type" value="upload" checked /> From My Computer</label>' +
			'<label><input type="radio" name="type" value="url" /> From the Web</label>' +
		'</h6>' +
		'<label class="upload button choose">' +
			'<span>Choose File</span>' +
			'<input type="file" name="{name}" />' +
		'</label>' +
		'<label class="url">' +
			'<span>Enter URL</span>' +
			'<input type="text" name="url" placeholder="Enter URL" />' +
		'</label>' +
		'<div class="error"></div>' +
		'<input type="submit" class="button" value="Done" disabled />' +
		'<input type="button" class="button" value="Cancel" />' +
	'</form>',

	getUI: function(editor) {
		var ui = editor.element.retrieve('htmlarea-image:ui');
		if (!ui) {
			editor.element.store('htmlarea-image:ui',
				(ui = new Element('div.htmlarea-image.upload', {
					html: this.template.substitute({
						action: editor.options.imageUploadURL || '/upload.json',
						name: editor.options.imageUploadName || 'file'
					})
				}))
			);
			ui.getElement('form').addEvent('submit', this.submit.bind(this, editor));
			ui.getElement('input[type=button]').addEvent('click', this.cancel.bind(this, editor));
			ui.getElements('input[name=type]').addEvent('change', this.typeChange.bind(this, editor));
			ui.getElement('input[type=file]').addEvent('change', this.fileChange.bind(this, editor));
			ui.getElement('input[name=url]').addEvent('input', this.validate.bind(this, editor));
			editor.fireEvent('buildImagePanel', { editor:editor, panel:ui, action:this });
		}
		return ui;
	},

	show: function(editor, btn) {
		var ui = this.getUI(editor);
		ui.store('htmlarea-image:range', editor.getRange());
		ui.getElement('input[type=file]').set('value', '');
		ui.getElement('input[name=url]').set('value', '');
		ui.getElements('input[type=radio]').set('disabled', false);
		ui.getElements('input[type=submit]').set('disabled', true);
		ui.getElement('label.upload').removeClass('progress').removeClass('complete')
			.getElement('span').set('text', 'Choose File');
		ui.addClass('show').inject(editor.element);
		editor.fireEvent('showImagePanel', { editor:editor, panel:ui, action:this });
	},

	hide: function(editor) {
		var ui = this.getUI(editor).removeClass('show').dispose();
		editor.fireEvent('hideImagePanel', { editor:editor, panel:ui });
	},

	submit: function(editor, e) {
		e.preventDefault();
		if (!this.validate(editor)) { return; }
		var ui = this.getUI(editor), html,
			type = ui.getElement('input[name=type]:checked').get('value');
			src = ui.getElement('input[name=url]').get('value').trim();
		editor.setRange(ui.retrieve('htmlarea-image:range'));
		html = '<img src="' + encodeURI(src) + '" />';
		if (editor.options.imageAutoLink) {
			html = '<a href="' + encodeURI(src) + '">' + html + '</a>';
		}
		editor.insert(html);
		this.hide(editor);
	},

	cancel: function(editor, e) {
		e.preventDefault();
		this.hide(editor);
	},

	getUploadSrc: function(editor, ui) {
		var full = ui.getElement('input[type=file]').get('value'),
			file = full.split(/[\/\\]/).slice(-1)[0], // basename(file)
			name = file.split('.').slice(0, -1).join('.'),
			ext = file.split('.').slice(-1)[0];
		return (editor.options.imageUploadSrc || '/uploads/{file}')
			.substitute({ file:file, name:name, ext:ext });
	},

	typeChange: function(editor, e) {
		var input = $(e.target), type = input.get('value'),
			ui = input.getParent('.htmlarea-image');
		if (ui.hasClass(type)) { return; }
		ui.removeClass(type === 'url' ? 'upload' : 'url').addClass(type);
		this.validate(editor, e);
		ui.getElement('.error').set('text', '');
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
				name = (file && file.name || input.get('value')).split(/[\/\\]/).slice(-1).join(''),
				size = file && file.size || NaN,
				max = editor.options.imageUploadMax || (6 * 1024 * 1024);

			if (!/\.(jpg|jpeg|png|gif|bmp)$/.test(name)) { error = 'Invalid File Format'; }
			else if (size && size > max) { error = 'Photo Is Too Large'; }
			ui.getElement('label.upload span').set('text', name || 'Choose File');
		}
		ui.getElement('.error').set('text', error || '');
		ui.getElement('input[type=submit]').set('disabled', !!error);
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
		if (xhr) {
			try { response = JSON.decode(xhr.responseText); }
			catch(er) { return this.failure(editor, ui, er.message); }
		}
		if (response && response.error) { return this.failure(editor, ui, response.error); }

		if (response && response.upload.url && response.upload.url) {
			ui.getElement('input[name=url]').set('value', response.upload.url);
		} else {
			ui.getElement('input[name=url]').set('value', this.getUploadSrc(editor, ui));
		}

		ui.getElement('label.upload').removeClass('progress').addClass('complete');
		ui.getElements('input[type=submit]').set('disabled', false);
	},

	failure: function(editor, ui, e) {
		var msg = e || 'The File Upload Failed';
		ui.getElement('label.upload').removeClass('progress');
		ui.getElements('input[type=submit],input[type=radio]').set('disabled', false);
		ui.getElement('.error').set('text', msg);
	},


	/**
	 * Resize, float image
	 **/
	editTemplate:
	'<div class="tools">' +
		'<span class="tools float">' +
			'<a class="float-left" data-action="float-left"><span><hr class="full"/><hr/><hr/><hr/><hr/><hr class="full"/><b></b></i></span></a>' +
			'<a class="float-none" data-action="float-none"><span><hr class="full"/><hr/ class="left"><hr class="right"/><hr class="full"/><b></b></span></a>' +
			'<a class="float-right" data-action="float-right"><span><hr class="full"/><hr/><hr/><hr/><hr/><hr class="full"/><b></b></span></a>' +
		'</span>' +
		'<a class="resize" data-action="resize"><span>&#8598;&#8600;</span></a>' +
		'<a class="remove" data-action="remove"><span>&times;</span></a>' +
	'</div>',

	getEditUI: function(editor, img) {
		var ui = editor.element.retrieve('htmlarea-image:edit-ui');
		if (!ui) {
			editor.element.store('htmlarea-image:edit-ui',
				(ui = new Element('div.htmlarea-image-edit',
					{ html:this.editTemplate })).inject(editor.element)
			);
			ui.addEvent('mousedown', this.edit.bind(this, editor, ui, img));
			ui.addEvent('mouseleave', this.hideEditUI.bind(this, editor, ui, img));
		}
		return ui;
	},

	imgMouseOver: function(editor, e) {
		if (e.target.nodeName.toLowerCase() !== 'img') { return; }
		var img = $(e.target), ui = this.getEditUI(editor, img);
		this.showEditUI(editor, ui, img);
	},

	hideEditUI: function(editor, ui, img, e) {
		editor.fireEvent('hideImageEditPanel', {
			editor:editor, panel:ui.removeClass('show'), image:img
		});
	},

	showEditUI: function(editor, ui, img) {
		var floatd = img.getStyles('float')['float'] || 'none';
		ui.getElements('.float a').removeClass('active');
		ui.getElement('.float-' + floatd).addClass('active');
		var pos = img.getPosition(editor.element), size = img.getSize();
		ui.setStyles({ width:size.x, height:size.y, left:pos.x, top:pos.y });
		editor.fireEvent('showImageEditPanel', {
			editor:editor, panel:ui.addClass('show'), image:img
		});
	},

	edit: function(editor, ui, img, e) {
		e.preventDefault(); // don't change focus
		var a = $(e.target), action;
		if (!a.get('data-action')) { a = a.getParent('[data-action]'); }
		if (!a || !(action = a.get('data-action'))) { return; }
		this[('run-' + action).camelCase()](editor, ui, img, e);
	},

	runRemove: function(editor, ui, img) {
		if (img.getParent().get('href') === img.get('src')) {
			img.getParent().destroy();
		} else {
			img.destroy();
		}
		this.hideEditUI(editor, ui);
	},

	runFloatLeft: function(editor, ui, img) {
		img.setStyle('float', 'left');
		this.showEditUI(editor, ui, img);
	},

	runFloatNone: function(editor, ui, img) {
		img.setStyle('float', 'none');
		this.showEditUI(editor, ui, img);
	},

	runFloatRight: function(editor, ui, img) {
		img.setStyle('float', 'right');
		this.showEditUI(editor, ui, img);
	},

	runResize: function(editor, ui, img, e) {
		var data = { editor:editor, ui:ui, img:img }, size = img.getSize();
		data.mousemove = this.resizeMouseMove.bind(this, data);
		data.mousedone = this.resizeMouseDone.bind(this, data);
		data.mouseOffset = { x:e.page.x - size.x, y:e.page.y - size.y };
		data.aspect = size.x / size.y;
		editor.element.addEvent('mousemove', data.mousemove);
		editor.element.addEvent('mouseup', data.mousedone);
		editor.element.addEvent('mouseleave', data.mousedone);
	},

	resizeMouseMove: function(data, e) {
		var width = e.page.x - data.mouseOffset.x,
			height = e.page.y - data.mouseOffset.y;
		if ((width / height) < data.aspect) {
			width = data.aspect * height;
		} else {
			height = width / data.aspect;
		}
		data.img.setStyles({ width:width, hieght:height });
		data.ui.setStyles({ width:width, height:height });
	},

	resizeMouseDone: function(data, e) {
		var editor = data.editor;
		editor.element.removeEvent('mousemove', data.mousemove);
		editor.element.removeEvent('mouseup', data.mousedone);
		editor.element.removeEvent('mouseleave', data.mousedone);
	}
} });
