/**
 * Insert images from a url or upload, manages editing them
 *
 * editor.options.imageOptions
 *  autoLink - (default: false) if true, inserted images are wrapped in a link pointing to the image
 *  dropText - (default: Drop to Upload) the text to display when dragging a file over the editor
 *  uploadMax - (default: 6 * 1024 * 1024 [6MB]) max number of bytes allowed in image size
 *  uploadURL - (default: /upload.json) url to post image uploads to
 *  uploadName - (default: file) field name used for image file uploads 
 *  dropErrorTimeout - (default: 3000) // ms until error message disappears
 **/
HtmlArea.Tools.Image = function(editor, o) {
	var bind = HtmlArea.Utils.bind;
	this.editor = editor;
	this.options = (o = o || {});
	o.autoLink = o.autoLink || false; // if true, inserted images are wrapped in a link pointing to the image
	o.uploadMax = o.uploadMax || (6 * 1024 * 1024); // [6MB] max number of bytes allowed in image size
	o.uploadURL = o.uploadURL || '/upload.json'; // url to post image uploads to
	o.uploadName = o.uploadName || 'file'; // field name used for image file upload
	this.uploader = new HtmlArea.Utils.Upload({
		onUploadSuccess: bind(this, this.uploadSuccess),
		onUploadFailure: bind(this, this.uploadFailure)
	});
	if (this.uploader.canUploadXhr()) {
		this.dropTool = new HtmlArea.Tools.Image.Drop(this, o);
	}
	editor.on('modechange', bind(this, this.hide));
};
HtmlArea.Tools.Image.prototype = {
	emptyGif: 'data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',

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

	chooseText: 'Choose File',

	getUI: function() {
		if (this.ui) { return this.ui; }
		var ui = (this.ui = document.createElement('div')), editor = this.editor,
			utils = HtmlArea.Utils, validate = utils.bindEvent(this, this.validate)
		ui.className = 'htmlarea-image upload';
		ui.innerHTML = this.template
			.replace('{action}', this.options.uploadURL)
			.replace('{name}', this.options.uploadName);
		this.uiFile = ui.querySelector('input[type=file]');
		this.uiUrl = ui.querySelector('input[name=url]');
		this.uiRadioUpload = ui.querySelector('input[name=type][value=upload]');
		this.uiRadioUrl = ui.querySelector('input[name=type][value=url]');
		this.uiSubmit = ui.querySelector('input[type=submit]');
		this.uiLabelUpload = ui.querySelector('label.upload');
		this.uiLabelSpan = this.uiLabelUpload.querySelector('span');
		this.uiError = ui.querySelector('.error');
	//	if (this.uploader.canUploadXhr()) { this.uiFile.multiple = true; }
		utils.onEvent(ui.querySelector('form'), 'submit', utils.bindEvent(this, this.submit));
		utils.onEvent(ui.querySelector('input[type=button]'), 'click', utils.bindEvent(this, this.cancel));
		utils.onEvent(this.uiRadioUpload, 'change', utils.bindEvent(this, this.typeChange));
		utils.onEvent(this.uiRadioUrl, 'change', utils.bindEvent(this, this.typeChange));
		utils.onEvent(this.uiFile, 'change', utils.bindEvent(this, this.fileChange));
		utils.onEvents(this.uiUrl, { keydown:validate, input:validate, change:validate });
		editor.fire('buildImagePanel', { editor:editor, panel:ui, tool:this });
		return ui;
	},

	show: function() {
		var ui = this.getUI(), editor = this.editor, utils = HtmlArea.Utils;
		this.range = editor.getRange();
		this.uiFile.value = this.uiUrl.value = '';
		this.uiRadioUrl.disabled = this.uiRadioUpload.disabled = false;
		this.uiSubmit.disabled = true;
		utils.removeClass(this.uiLabelUpload, 'progress');
		utils.removeClass(this.uiLabelUpload, 'complete');
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
		if (this.validate()) {
			var ui = this.getUI(),
				src = this.uiUrl.value.replace(/^\s+|\s+$/g, '');
			this.insert(src);
			this.hide();
		}
		if (e.preventDefault) { e.preventDefault(); } // don't submit the form
		return e.returnValue = false;
	},

	cancel: function(e) {
		this.hide();
		if (e.preventDefault) { e.preventDefault(); }
		return e.returnValue = false;
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

	fileChange: function(e) {
		if (!this.validate()) { return; }
		var ui = this.getUI(), utils = HtmlArea.Utils;
		utils.addClass(this.uiLabelUpload, 'progress');
		this.uiSubmit.disabled = this.uiRadioUpload.disabled
			= this.uiRadioUrl.disabled = true;
		this.uploader.uploadForm(ui.firstChild);
	},

	validate: function(e) {
		var ui = this.getUI(), error;
		if (this.uiRadioUrl.checked) { // basically just have to have a non-whitespace string
			var url = this.uiUrl.value.replace(/^\s+|\s+$/g, '');
			if (!url) { error = 'URL Is Required'; }
		} else {
			var input = this.uiFile, file = input.files && input.files[0],
				name = (file && file.name || input.get('value')).split(/[\/\\]/).slice(-1).join(''),
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
		if (!/\.(jpg|jpeg|png|gif|bmp)$/i.test(name)) { error = 'Invalid File Format'; }
		else if (size && size > max) { error = 'Photo Is Too Large'; }
		return error;
	},

	uploadSuccess: function(data) {
		if (!data.response.upload || !data.response.upload.url) {
			data.error = 'No Url Was Returned';
			return this.uploadFailure(data);
		}

		this.insert(data.response.upload.url);
		this.hide();
	},

	uploadFailure: function(data) {
		var msg = data.error || 'Upload Failed', ui = this.getUI();
		utils.removeClass(this.uiLabelUpload, 'progress');
		this.uiSubmit.disabled = this.uiRadioUpload.disabled
			= this.uiRadioUrl.disabled = false;
		this.uiError.innerHTML = msg;
	},

	insert: function(src, href) {
		this.editor.setRange(this.range);
		var html = '<img src="' + encodeURI(src) + '" />';
		if (this.options.autoLink) {
			html = '<a href="' + encodeURI(href || src) + '">' + html + '</a>';
		}
		this.editor.insert(html);
		try { this.editor.exec('enableObjectResizing', false); } catch(err) {} // disable UA resizing
	}

};


/**
 * Manages dropping images from the desktop
 **/
HtmlArea.Tools.Image.Drop = function(image, o) {
	var editor = (this.editor = image.editor), utils = HtmlArea.Utils;
	this.image = image;
	this.options = o;
	o.dropText = o.dropText || 'Drop to Upload'; // the text to display when dragging a file over the editor
	o.dropErrorTimeout = o.dropErrorTimeout || 3000; // ms until error message disappears

	this.uploader = new HtmlArea.Utils.Upload({
		onUploadSuccess: utils.bind(this, this.uploadSuccess),
		onUploadFailure: utils.bind(this, this.uploadFailure)
	});

	this.dragEnter = utils.bindEvent(this, this.dragEnter);
	this.dragLeave = utils.bindEvent(this, this.dragLeave);
	this.dragOver = utils.bindEvent(this, this.dragOver);
	this.drop = utils.bindEvent(this, this.drop);
	this.hide = utils.bindEvent(this, this.hide);
	utils.onEvent(editor.element, 'dragenter', this.dragEnter);
};
HtmlArea.Tools.Image.Drop.prototype = {
	getUI: function() {
		var ui = this.ui, utils = HtmlArea.Utils;
		if (!ui) {
			ui = (this.ui = document.createElement('div'));
			ui.className = 'htmlarea-image-drop';
			ui.innerHTML = '<label><span></span><em></em></label>';
			this.mask = document.createElement('div');
			this.mask.className = 'mask';
			ui.appendChild(this.mask);
			utils.onEvents(this.mask, { dragleave:this.dragLeave, dragover:this.dragOver, drop:this.drop });
			this.progress = ui.querySelector('em');
			this.span = ui.querySelector('span');
			editor.fire('buildImageDropPanel', { editor:editor, panel:ui, tool:this });
		}
		return ui;
	},

	dragEnter: function(e) {
		var editor = this.editor, utils = HtmlArea.Utils, ui = this.getUI();
		this.progress.textContent = '';
		this.span.textContent = this.options.dropText;
		utils.removeClass(ui, 'progress');
		utils.removeClass(ui, 'error');
		ui.width = editor.element.offsetWidth + 'px';
		ui.height = editor.element.offsetHeight + 'px';
		editor.element.appendChild(ui);
		if (this.timer) { clearTimeout(this.timer); this.timer = null; }
		editor.fire('showImageDropPanel', { editor:editor, panel:ui, tool:this });
	},

	dragLeave: function(e) {
		this.editor.fire('hideImageDropPanel', {
			editor:this.editor, panel:this.hide(), tool:this
		});
	},

	dragOver: function(e) { e.preventDefault(); e.stopPropagation(); return false; },

	drop: function(e) {
		var file = e && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0],
			name = file && file.name || '', size = file && file.size || NaN,
			error = this.image.getFileError(name, size), utils = HtmlArea.Utils;
		if (error) { this.uploadFailure({ error:error }); }
		else {
			utils.addClass(this.ui, 'progress');
			this.span.textContent = name;
			var data = new FormData();
			data.append(this.options.uploadName, file);
			this.uploader.uploadXhr(data, this.options.uploadURL);
		}
		e.preventDefault(); e.stopPropagation();
		return false;
	},

	uploadSuccess: function(data) {
		if (!data.response.upload || !data.response.upload.url) {
			data.error = 'No Url Was Returned';
			return this.uploadFailure(data);
		}

		this.image.insert(data.response.upload.url);
		this.hide();
	},

	uploadProgress: function(xhr, e) {
		if (e.lengthComputable) {
		  var percent = ~~((e.loaded / e.total) * 100); // integer percentage
		  this.progress.textContent = ' ' + percent + '%';
		}
	},

	uploadFailure: function(data) {
		var msg = data.error || 'Upload Failed', utils = HtmlArea.Utils;
		utils.removeClass(this.ui, 'progress');
		utils.addClass(this.ui, 'error');
		this.span.textContent = msg;
		this.timer = setTimeout(this.hide, this.options.dropErrorTimeout);
	},

	hide: function() {
		var ui = this.getUI(), parent = ui.parentNode;
		if (parent) { parent.removeChild(ui); }
		return ui;
	}
};


/**
 * Tool interface
 **/
HtmlArea.Tools.Image.title = 'Add Picture';
HtmlArea.Tools.Image.text = '<b>&#9679;</b><span>&#9728;</span>';
HtmlArea.Tools.Image.setup = function(e, o) { if (!e.imageTool) { e.imageTool = new HtmlArea.Tools.Image(e, o); } };
HtmlArea.Tools.Image.run = function(editor) { editor.imageTool.show(); };

HtmlArea.Tools.addTool('image', HtmlArea.Tools.Image);
