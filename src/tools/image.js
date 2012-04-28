/**
 * Insert images from a url or upload, manages editing them
 *
 * editor.options.imageOptions
 *  autoLink - (default: false) if true, inserted images are wrapped in a link pointing to the image
 *  uploadMax - (default: 6 * 1024 * 1024 [6MB]) max number of bytes allowed in image size
 *  uploadURL - (default: /upload.json) url to post image uploads to
 *  uploadName - (default: file) field name used for image file uploads
 *
 * editor.options.imageStrings
 *  title: 'Add Picture:'
 *  local: 'From My Computer'
 *  remote: 'From the Web'
 *  choose: 'Choose File'
 *  urlLabel: 'Enter URL'
 *  urlPlaceholder: 'Enter URL'
 *  done: 'Done'
 *  cancel: 'cancel'
 **/
HtmlArea.Tools.Image = function(editor, o, s) {
	this.editor = editor;
	this.options = HtmlArea.Utils.merge(this.options, o);
	this.strings = HtmlArea.Utils.merge(this.strings, s);
	this.setupEvents(this.options);
	editor.on('modechange', this.bind(this.hide));
};
HtmlArea.Tools.Image.prototype = HtmlArea.Events({
	emptyGif: 'data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',

	template:
	'<form action="{action}" method="post" enctype="multipart/form-data" encoding="multipart/form-data" accept-charset="utf-8">' +
		'<h6>' +
			'<span>{title}</span>' +
			'<label><input type="radio" name="type" value="upload" checked /> {local}</label>' +
			'<label><input type="radio" name="type" value="url" /> {remote}</label>' +
		'</h6>' +
		'<label class="upload button choose">' +
			'<span>{choose}</span>' +
			'<input type="file" name="{uploadName}" />' +
		'</label>' +
		'<label class="url">' +
			'<span>{urlLabel}</span>' +
			'<input type="text" name="url" placeholder="{urlPlaceholder}" />' +
		'</label>' +
		'<div class="error"></div>' +
		'<input type="submit" class="button" value="{done}" disabled />' +
		'<input type="button" class="button" value="{cancel}" />' +
	'</form>',

	options: {
		autoLink: false,
		uploadMax: (6 * 1024 * 1024),
		uploadURL: '/upload.json',
		uploadName: 'file'
	},

	strings: {
		title: 'Add Picture:',
		local: 'From My Computer',
		remote: 'From the Web',
		choose: 'Choose File',
		urlLabel: 'Enter URL',
		urlPlaceholder: 'Enter URL',
		done: 'Done',
		cancel: 'cancel'
	},

	getUI: function() {
		if (this.ui) { return this.ui; }
		var ui = (this.ui = document.createElement('div')), editor = this.editor,
			utils = HtmlArea.Utils, validate = this.bindEvent(this.validate)
		ui.className = 'htmlarea-image upload';
		ui.innerHTML = utils.format(this.template, this.options, this.strings, this);
		this.uiFile = ui.querySelector('input[type=file]');
		this.uiUrl = ui.querySelector('input[name=url]');
		this.uiRadioUpload = ui.querySelector('input[name=type][value=upload]');
		this.uiRadioUrl = ui.querySelector('input[name=type][value=url]');
		this.uiSubmit = ui.querySelector('input[type=submit]');
		this.uiLabelUpload = ui.querySelector('label.upload');
		this.uiLabelSpan = this.uiLabelUpload.querySelector('span');
		this.uiError = ui.querySelector('.error');
		if (utils.Upload.prototype.canUploadXhr()) { this.uiFile.multiple = true; }
		this.on(ui.querySelector('form'), 'submit',this.submit);
		this.on(ui.querySelector('input[type=button]'), 'click', this.cancel);
		this.on(this.uiRadioUpload, 'change', this.typeChange);
		this.on(this.uiRadioUrl, 'change', this.typeChange);
		this.on(this.uiFile, 'change', validate, true);
		this.ons(this.uiUrl, { keydown:validate, input:validate, change:validate }, true);
		editor.fire('buildImagePanel', { editor:editor, panel:ui, tool:this });
		return ui;
	},

	show: function() {
		var ui = this.getUI(), editor = this.editor;
		this.range = editor.getRange();
		this.uiFile.value = this.uiUrl.value = '';
		this.uiSubmit.disabled = true;
		this.uiLabelSpan.innerHTML = this.chooseText;
		editor.element.appendChild(ui);
		editor.fire('showImagePanel', { editor:editor, panel:ui, tool:this });
	},

	hide: function() {
		var ui = this.getUI(), parent = ui.parentNode;
		if (parent) { parent.removeChild(ui); }
		this.editor.fire('hideImagePanel', {
			editor:this.editor, panel:ui, tool:this
		});
	},

	submit: function(e) {
		e.preventDefault(); // don't submit the form
		if (!this.validate()) { return false; }

		var ui = this.getUI(), id;
		if (this.uiRadioUrl.checked) {
			this.insert(this.uiUrl.value.replace(/^\s+|\s+$/g, ''));
		} else {
			this.editor.setRange(this.range);
			if (this.uiFile.multiple) {
				var files = this.uiFile.files, f, ff = files.length,
					form = ui.firstChild, url = form.action, src,
					URL = window.URL || window.webkitURL || {};
				for (f = 0; f < ff; ++f) {
					src = URL.createObjectURL && URL.createObjectURL(files[f]) || this.emptyGif;
					id = this.insertPlaceholder(src, files[f].name);
					data = new FormData();
					data.append(this.uiFile.name, files[f]);
					(new HtmlArea.Utils.Upload({
						onUploadSuccess: this.bind(this.uploadSuccess, id, src),
						onUploadFailure: this.bind(this.uploadFailure, id, src)
					})).uploadXhr(data, url);
				}
			} else {
				id = this.insertPlaceholder(this.emptyGif, this.uiFile.value.split(/[\/\\]/).slice(-1).join(''));
				(new HtmlArea.Utils.Upload({
					onUploadSuccess: this.bind(this.uploadSuccess, id, this.emptyGif),
					onUploadFailure: this.bind(this.uploadFailure, id, this.emptyGif)
				})).uploadForm(ui.firstChild);
			}
		}
		this.hide();
		return false;
	},

	cancel: function(e) {
		this.hide();
		e.preventDefault();
		return false;
	},

	typeChange: function(e) {
		var input = e.target, type = input.value, ui = this.getUI(),
			utils = HtmlArea.Utils;
		if (utils.hasClass(ui, type)) { return; }
		utils.removeClass(ui, type === 'url' ? 'upload' : 'url');
		utils.addClass(ui, type);
		this.validate();
		this.uiError.innerHTML = '';
	},

	validate: function(e) {
		var ui = this.getUI(), error = '';
		if (this.uiRadioUrl.checked) { // basically just have to have a non-whitespace string
			var url = this.uiUrl.value.replace(/^\s+|\s+$/g, '');
			if (!url) { error = 'URL Is Required'; }
		} else if (this.uiFile.multiple && this.uiFile.files && this.uiFile.files.length > 1) {
			var files = this.uiFile.files, f, ff = files.length, name, size, file,
				label = this.uiFile.value.split(/[\/\\]/).slice(-1).join('');
			for (f = 0; f < ff && !error; ++f) {
				if (!(file = files[f])) { continue; }
				name = (file && file.name || '').split(/[\/\\]/).slice(-1).join(''),
				size = file && file.size || NaN;
				error = this.getFileError(name, size);
			}
			this.uiLabelSpan.innerHTML = label || 'Choose File';
		} else {
			var input = this.uiFile, file = input.files && input.files[0],
				name = input.value.split(/[\/\\]/).slice(-1).join(''),
				size = file && file.size || NaN;

			error = this.getFileError(name, size);
			this.uiLabelSpan.innerHTML = name || 'Choose File';
		}
		this.uiError.innerHTML = error || '';
		this.uiSubmit.disabled = !!error;
		return e ? true : !error;
	},

	getFileError: function(name, size) {
		var error, max = this.options.uploadMax || (6 * 1024 * 1024);
		if (!/\.(jpg|jpeg|png|gif|bmp)$/i.test(name)) { error = name + ' is invalid'; }
		else if (size && size > max) { error = name + ' is too large'; }
		return error;
	},

	uploadSuccess: function(id, src, data) {
		if (!data.response.upload || !data.response.upload.url) {
			data.error = 'No Url Was Returned';
			return this.uploadFailure(id, src, data);
		}
		var img = document.getElementById(id),
			URL = window.URL || window.webkitURL || {};
		if (URL.revokeObjectURL && this.emptyGif !== src) { URL.revokeObjectURL(src); }

		img.id = '';
		img.src = data.response.upload.url;
		HtmlArea.Utils.removeClass(img, 'image-placeholder');
		if (this.options.autoLink) {
			var a = document.createElement('a');
			a.href = data.response.upload.href || data.response.upload.url;
			img.parentNode.replaceChild(a, img);
			a.appendChild(img);
		}

		var editor = this.editor;
		setTimeout(function(){ editor.updateTools(); }, 200);
	},

	uploadFailure: function(id, src, data) {
		var msg = data.error || 'Upload Failed', ui = this.getUI(),
			placeholder = document.getElementById(id),
			URL = window.URL || window.webkitURL || {};
		if (URL.revokeObjectURL && this.emptyGif !== src) { URL.revokeObjectURL(src); }
		this.editor.fire('error', { editor:this.editor, panel:ui, tool:this, message:msg });
		if (!placeholder) { return; }

		placeholder.className += ' error';
		setTimeout(function(){ placeholder.parentNode.removeChild(placeholder); }, 3000);
	},

	insert: function(src, href) {
		this.editor.setRange(this.range);
		var html = '<img src="' + encodeURI(src) + '" />';
		if (this.options.autoLink) {
			html = '<a href="' + encodeURI(href || src) + '">' + html + '</a>';
		}
		this.editor.insert(html);
		try { this.editor.exec('enableObjectResizing', false); } catch(err) {} // disable UA resizing
	},

	insertPlaceholder: function(src, name) {
		var id = this.placeholderId(),
			html = '<img id="'+id+'" class="image-placeholder" src="'+encodeURI(src)+'" />';
		this.editor.insert(html);
		try { this.editor.exec('enableObjectResizing', false); } catch(err) {} // disable UA resizing
		return id;
	},

	placeholderId: (function(){
		var id = 0;
		return function() { return 'img-place-'+(++id); };
	})()
});

/**
 * Tool interface
 **/
HtmlArea.Tools.Image.title = 'Add Picture';
HtmlArea.Tools.Image.text = '<b>&#9679;</b><span>&#9728;</span>';
HtmlArea.Tools.Image.setup = function(e, o) { if (!e.imageTool) { e.imageTool = new HtmlArea.Tools.Image(e, o); } };
HtmlArea.Tools.Image.run = function(editor) { editor.imageTool.show(); };

HtmlArea.Tools.addTool('image', HtmlArea.Tools.Image);

