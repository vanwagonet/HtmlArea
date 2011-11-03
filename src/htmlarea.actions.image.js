/**
 * Insert images from a url or upload
 *
 * editor options used:
 *  imageAutoLink - (default: false) if true, inserted images are wrapped in a link pointing to the image
 *  imageDropText - (default: Drop to Upload) the text to display when dragging a file over the editor
 *  imageUploadMax - (default: 6 * 1024 * 1024 [6MB]) max number of bytes allowed in image size
 *  imageUploadURL - (default: /upload.json) url to post image uploads to
 *  imageUploadName - (default: file) field name used for image file uploads
 **/
HtmlArea.Actions.addActions({ image: { title:'Add Picture', text:'<b>&#9679;</b><span>&#9728;</span>',

	added: function(editor) {
		editor.content.addEvent('mouseover', this.imgMouseOver.bind(this, editor));
		if (editor.element.addEventListener && this.canXHR2()) {
			var data = {};
			data.dragenter = this.fileDragEnter.bind(this, editor, data);
			data.dragleave = this.fileDragLeave.bind(this, editor, data);
			data.dragover = this.fileDragOver.bind(this, editor, data);
			data.drop = this.fileDrop.bind(this, editor, data);
			editor.element.addEventListener('dragenter', data.dragenter, false);
		}
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
		editor.fireEvent('hideImagePanel', { editor:editor, panel:ui, action:this });
	},

	submit: function(editor, e) {
		e.preventDefault();
		if (!this.validate(editor)) { return; }
		var ui = this.getUI(editor),
			src = ui.getElement('input[name=url]').get('value').trim();
		this.insert(editor, ui, src);
		this.hide(editor);
	},

	cancel: function(editor, e) {
		e.preventDefault();
		this.hide(editor);
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
		var ui = this.getUI(editor);
		ui.getElement('label.upload').addClass('progress');
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
				size = file && file.size || NaN;

			error = this.getFileError(editor, name, size);
			ui.getElement('label.upload span').set('text', name || 'Choose File');
		}
		ui.getElement('.error').set('text', error || '');
		ui.getElement('input[type=submit]').set('disabled', !!error);
		return !error;
	},

	getFileError: function(editor, name, size) {
		var error, max = editor.options.imageUploadMax || (6 * 1024 * 1024);
		if (!/\.(jpg|jpeg|png|gif|bmp)$/.test(name)) { error = 'Invalid File Format'; }
		else if (size && size > max) { error = 'Photo Is Too Large'; }
		return error;
	},

	canXHR2: function() { return window.File && window.FormData && window.XMLHttpRequest && !window.File.prototype.getAsBinary && true || false; },

	upload: function(editor, ui, url) {
		var input = ui.getElement('input[type=file]'), form = ui.getElement('form');
		if (this.canXHR2()) { // upload in ajax request
			this.uploadXHR2(editor, ui, input.files[0], this.success, this.failure);
		} else { // post to hidden iframe
			var iframe = new Element('iframe', { name:this.getIframeId(), src:'javascript:""' }).inject(form, 'after'),
				success = this.success.bind(this, editor, ui),
				failure = this.failure.bind(this, editor, ui),
				iframeReadyStateChange = this.iframeReadyStateChange.bind(this, editor, ui, iframe);
			iframe.addEvents({ error:failure, abort:failure, load:iframeReadyStateChange, readystatechange:iframeReadyStateChange });
			form.set('target', iframe.name).submit();
		}
	},

	uploadXHR2: function(editor, ui, file, success, failure) {
		var data = new FormData(), xhr = new XMLHttpRequest();
		success = success.bind(this, editor, ui, xhr);
		failure = failure.bind(this, editor, ui, xhr);

		data.append(editor.options.imageUploadName || 'file', file);

		xhr.addEventListener('load', success, false);
		xhr.addEventListener('error', failure, false);
		xhr.addEventListener('abort', failure, false);
		xhr.open('POST', editor.options.imageUploadURL || '/upload.json', true);
		xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		xhr.send(data);
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
			catch(er) { return this.failure(editor, ui, xhr, er.message); }
		}
		if (response && response.error) { return this.failure(editor, ui, xhr, response.error); }
		if (!response || !response.upload || !response.upload.url) { return this.failure(editor, ui, xhr, 'No url was returned from upload'); }

		this.insert(editor, ui, response.upload.url);
		this.hide(editor);
	},

	failure: function(editor, ui, xhr, e) {
		var msg = e || 'The File Upload Failed';
		ui.getElement('label.upload').removeClass('progress');
		ui.getElements('input[type=submit],input[type=radio]').set('disabled', false);
		ui.getElement('.error').set('text', msg);
	},

	insert: function(editor, ui, src) {
		editor.setRange(ui.retrieve('htmlarea-image:range'));
		var html = '<img src="' + encodeURI(src) + '" />';
		if (editor.options.imageAutoLink) {
			html = '<a href="' + encodeURI(src) + '">' + html + '</a>';
		}
		editor.insert(html);
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
			editor.fireEvent('buildImageEditPanel', { editor:editor, panel:ui, action:this });
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
			editor:editor, panel:ui.removeClass('show'), image:img, action:this
		});
	},

	showEditUI: function(editor, ui, img) {
		var floatd = img.getStyles('float')['float'] || 'none';
		ui.getElements('.float a').removeClass('active');
		ui.getElement('.float-' + floatd).addClass('active');
		var pos = img.getPosition(editor.element), size = img.getSize();
		ui.setStyles({ width:size.x, height:size.y, left:pos.x, top:pos.y });
		editor.fireEvent('showImageEditPanel', {
			editor:editor, panel:ui.addClass('show'), image:img, action:this
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
	},


	/**
	 * Drop in files from desktop
	 **/
	fileDragEnter: function(editor, data, e) {
		if (!data.ui) {
			data.ui = new Element('div.htmlarea-image-drop', { html:'<span></span>' });
			data.mask = (new Element('div.mask')).inject(data.ui);
			data.mask.addEventListener('dragleave', data.dragleave, false);
			data.mask.addEventListener('dragover', data.dragover, false);
			data.mask.addEventListener('drop', data.drop, false);
			editor.fireEvent('buildImageDropPanel', { editor:editor, panel:data.ui, action:this });
		}
		var size = editor.element.getSize();
		data.ui.getElement('span').set('text', editor.options.imageDropText || 'Drop to Upload');
		data.ui.removeClass('progress').removeClass('error')
			.setStyles({ width:size.x, height:size.y }).inject(editor.element);
		if (data.timer) { clearTimeout(data.timer); data.timer = null; }
		editor.fireEvent('showImageDropPanel', {
			editor:editor, panel:data.ui, action:this
		});
	},

	fileDragLeave: function(editor, data, e) {
		editor.fireEvent('hideImageDropPanel', {
			editor:editor, panel:data.ui.dispose(), action:this
		});
	},

	fileDragOver: function(editor, data, e) { e.preventDefault(); e.stopPropagation(); return false; },

	fileDrop: function(editor, data, e) {
		e.preventDefault(); e.stopPropagation();
		var file = e && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0],
			name = file && file.name || '', size = file && file.size || NaN,
			error = this.getFileError(editor, name, size);
		if (error) {
			this.dropFailure(editor, data, null, error);
		} else {
			data.ui.addClass('progress');
			this.uploadXHR2(editor, data, file, this.dropSuccess, this.dropFailure);
		}
	},

	dropSuccess: function(editor, data, xhr, response) {
		if (xhr) {
			try { response = JSON.decode(xhr.responseText); }
			catch(er) { return this.dropFailure(editor, data, xhr, er.message); }
		}
		if (response && response.error) { return this.dropFailure(editor, data, xhr, response.error); }
		if (!response || !response.upload || !response.upload.url) { return this.dropFailure(editor, data, xhr, 'No Url Was Returned'); }

		this.insert(editor, this.getUI(editor), response.upload.url);
		data.ui.dispose();
	},

	dropFailure: function(editor, data, xhr, e) {
		var msg = e || 'The File Upload Failed';
		data.ui.removeClass('progress').addClass('error').getElement('span').set('text', msg);
		data.timer = setTimeout(function() { data.ui.dispose(); }, 3000);
	}
} });
