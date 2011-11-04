/**
 * Insert images from a url or upload, manages editing them
 *
 * editor options used:
 *  imageAutoLink - (default: false) if true, inserted images are wrapped in a link pointing to the image
 *  imageDropText - (default: Drop to Upload) the text to display when dragging a file over the editor
 *  imageUploadMax - (default: 6 * 1024 * 1024 [6MB]) max number of bytes allowed in image size
 *  imageUploadURL - (default: /upload.json) url to post image uploads to
 *  imageUploadName - (default: file) field name used for image file uploads
 *  imageDropErrorTimeout - (default: 3000) // ms until error message disappears
 **/
HtmlArea.Tools.Image = new Class({

	Implements: [ Events, Options ],

	options: {},

	initialize: function(editor) {
		this.editor = editor;
		var o = editor.options;
		this.setOptions({
			autoLink: (editor.options.imageAutoLink || false), // if true, inserted images are wrapped in a link pointing to the image
			uploadMax: o.imageUploadMax || (6 * 1024 * 1024), // [6MB] max number of bytes allowed in image size
			uploadURL: o.imageUploadURL || '/upload.json', // url to post image uploads to
			uploadName: o.imageUploadName || 'file' // field name used for image file upload
		});
		this.editTool = new HtmlArea.Tools.Image.Edit(this);
		this.dropTool = new HtmlArea.Tools.Image.Drop(this);
		this.uploader = new HtmlArea.Utils.Uploader({
			onUploadSuccess: this.uploadSuccess.bind(this),
			onUploadFailure: this.uploadFailure.bind(this)
		});
	},

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
		var ui = (this.ui = new Element('div.htmlarea-image.upload', {
			html: this.template.substitute({
				action: this.options.uploadURL,
				name: this.options.uploadName
			})
		})), editor = this.editor;
		ui.getElement('form').addEvent('submit', this.submit.bind(this));
		ui.getElement('input[type=button]').addEvent('click', this.cancel.bind(this));
		ui.getElements('input[name=type]').addEvent('change', this.typeChange.bind(this));
		ui.getElement('input[type=file]').addEvent('change', this.fileChange.bind(this));
		ui.getElement('input[name=url]').addEvent('input', this.validate.bind(this));
		editor.fireEvent('buildImagePanel', { editor:editor, panel:ui, tool:this });
		return ui;
	},

	show: function() {
		var ui = this.getUI(), editor = this.editor;
		this.range = editor.getRange();
		ui.getElement('input[type=file]').set('value', '');
		ui.getElement('input[name=url]').set('value', '');
		ui.getElements('input[type=radio]').set('disabled', false);
		ui.getElements('input[type=submit]').set('disabled', true);
		ui.getElement('label.upload').removeClass('progress').removeClass('complete')
			.getElement('span').set('text', this.chooseText);
		ui.inject(editor.element);
		editor.fireEvent('showImagePanel', { editor:editor, panel:ui, tool:this });
	},

	hide: function() {
		this.editor.fireEvent('hideImagePanel', {
			editor:this.editor, panel:this.getUI().dispose(), tool:this
		});
	},

	submit: function(e) {
		e.preventDefault();
		if (!this.validate(e)) { return; }
		var ui = this.getUI(),
			src = ui.getElement('input[name=url]').get('value').trim();
		this.insert(src);
		this.hide();
	},

	cancel: function(e) {
		e.preventDefault();
		this.hide();
	},

	typeChange: function(e) {
		var input = $(e.target), type = input.get('value'),
			ui = this.getUI();
		if (ui.hasClass(type)) { return; }
		ui.removeClass(type === 'url' ? 'upload' : 'url').addClass(type);
		this.validate(e);
		ui.getElement('.error').set('text', '');
	},

	fileChange: function(e) {
		if (!this.validate(e)) { return; }
		var ui = this.getUI();
		ui.getElement('label.upload').addClass('progress');
		ui.getElement('input[type=submit],input[type=radio]').set('disabled', true);
		this.uploader.uploadForm(ui.getElement('form'));
	},

	validate: function(e) {
		var ui = this.getUI(), error,
			type = ui.getElement('input[name=type]:checked').get('value');
		if (type === 'url') { // basically just have to have a non-whitespace string
			var url = ui.getElement('input[name=url]').get('value').trim();
			if (!url) { error = 'URL Is Required'; }
		} else {
			var input = ui.getElement('input[type=file]'), file = input.files && input.files[0],
				name = (file && file.name || input.get('value')).split(/[\/\\]/).slice(-1).join(''),
				size = file && file.size || NaN;

			error = this.getFileError(name, size);
			ui.getElement('label.upload span').set('text', name || 'Choose File');
		}
		ui.getElement('.error').set('text', error || '');
		ui.getElement('input[type=submit]').set('disabled', !!error);
		return !error;
	},

	getFileError: function(name, size) {
		var error, max = this.options.uploadMax || (6 * 1024 * 1024);
		if (!/\.(jpg|jpeg|png|gif|bmp)$/.test(name)) { error = 'Invalid File Format'; }
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
		ui.getElement('label.upload').removeClass('progress');
		ui.getElements('input[type=submit],input[type=radio]').set('disabled', false);
		ui.getElement('.error').set('text', msg);
	},

	insert: function(src) {
		this.editor.setRange(this.range);
		var html = '<img src="' + encodeURI(src) + '" />';
		if (this.options.autoLink) {
			html = '<a href="' + encodeURI(src) + '">' + html + '</a>';
		}
		this.editor.insert(html);
	}

}).extend({ // static

	/**
	 * Manages placing and sizing an image
	 **/
	Edit: new Class({

		Implements: [ Events, Options ],

		options: {},

		initialize: function(image) {
			this.image = image;
			this.editor = image.editor;
			this.editor.content.addEvent('mouseover', this.mouseOver.bind(this));
		},

		template:
		'<div class="tools">' +
			'<span class="tools float">' +
				'<a class="float-left" data-tool="float-left"><span><hr class="full"/><hr/><hr/><hr/><hr/><hr class="full"/><b></b></i></span></a>' +
				'<a class="float-none" data-tool="float-none"><span><hr class="full"/><hr/ class="left"><hr class="right"/><hr class="full"/><b></b></span></a>' +
				'<a class="float-right" data-tool="float-right"><span><hr class="full"/><hr/><hr/><hr/><hr/><hr class="full"/><b></b></span></a>' +
			'</span>' +
			'<a class="resize" data-tool="resize"><span>&#8598;&#8600;</span></a>' +
			'<a class="remove" data-tool="remove"><span>&times;</span></a>' +
		'</div>',

		getUI: function() {
			if (this.ui) { return this.ui; }
			this.ui = new Element('div.htmlarea-image-edit', { html:this.template })
				.addEvents({ mousedown:this.edit.bind(this), mouseleave:this.hide.bind(this) });
			this.resizeMouseMove = this.resizeMouseMove.bind(this);
			this.resizeMouseDone = this.resizeMouseDone.bind(this);
			editor.fireEvent('buildImageEditPanel', { editor:editor, panel:this.ui, tool:this });
			return this.ui;
		},

		mouseOver: function(e) {
			if (e.target.nodeName.toLowerCase() !== 'img') { return; }
			this.img = $(e.target);
			this.show();
		},

		show: function() {
			var img = this.img, ui = this.getUI(), editor = this.editor,
				floatd = img.getStyles('float')['float'] || 'none',
				pos = img.getPosition(editor.element), size = img.getSize();
			ui.getElements('.float a').removeClass('active');
			ui.getElement('.float-' + floatd).addClass('active');
			ui.setStyles({ width:size.x, height:size.y, left:pos.x, top:pos.y });
			editor.fireEvent('showImageEditPanel', {
				editor:editor, panel:ui.inject(editor.element), image:img, tool:this
			});
		},

		hide: function() {
			this.editor.fireEvent('hideImageEditPanel', {
				editor:this.editor, panel:this.ui.dispose(), image:this.img, tool:this
			});
		},

		edit: function(e) {
			e.preventDefault(); // don't change focus
			var a = $(e.target), tool;
			if (!a.get('data-tool')) { a = a.getParent('[data-tool]'); }
			if (!a || !(tool = a.get('data-tool'))) { return; }
			this[('run-' + tool).camelCase()](this.img, e);
		},

		runRemove: function(img) {
			if (img.getParent().get('href') === img.get('src')) { img = img.getParent(); }
			img.destroy();
			this.hide();
		},

		runFloatLeft: function(img) {
			img.setStyle('float', 'left');
			this.show();
		},

		runFloatNone: function(img) {
			img.setStyle('float', 'none');
			this.show();
		},

		runFloatRight: function(img) {
			img.setStyle('float', 'right');
			this.show();
		},

		runResize: function(img, e) {
			var size = img.getSize();
			this.mouseOffset = { x:e.page.x - size.x, y:e.page.y - size.y };
			this.aspect = size.x / size.y;
			this.editor.element.addEvents({
				mousemove: this.resizeMouseMove,
				mouseup: this.resizeMouseDone,
				mouseleave: this.resizeMouseDone
			});
		},

		resizeMouseMove: function(e) {
			var width = e.page.x - this.mouseOffset.x,
				height = e.page.y - this.mouseOffset.y;
			if ((width / height) < this.aspect) {
				width = this.aspect * height;
			} else {
				height = width / this.aspect;
			}
			this.img.setStyles({ width:width, hieght:height });
			this.ui.setStyles({ width:width, height:height });
		},

		resizeMouseDone: function(e) {
			var elm = this.editor.element;
			elm.removeEvent('mousemove', this.resizeMouseMove);
			elm.removeEvent('mouseup', this.resizeMouseDone);
			elm.removeEvent('mouseleave', this.resizeMouseDone);
		}
	}),


	/**
	 * Manages dropping images from the desktop
	 **/
	Drop: new Class({

		Implements: [ Events, Options ],

		options: {},

		initialize: function(image) {
			this.image = image;
			var editor = (this.editor = image.editor),
				o = editor.options;
			this.setOptions({
				dropText: o.imageDropText || 'Drop to Upload', // the text to display when dragging a file over the editor
				uploadURL: o.imageUploadURL || '/upload.json', // url to post image uploads to
				uploadName: o.imageUploadName || 'file', // field name used for image file uploads
				errorTimeout: o.imageDropErrorTimeout || 3000 // ms until error message disappears
			});

			this.uploader = new HtmlArea.Utils.Uploader({
				onUploadSuccess: this.uploadSuccess.bind(this),
				onUploadFailure: this.uploadFailure.bind(this)
			});

			if (this.uploader.canUploadXhr()) {
				this.dragEnter = this.dragEnter.bind(this);
				this.dragLeave = this.dragLeave.bind(this);
				this.dragOver = this.dragOver.bind(this);
				this.drop = this.drop.bind(this);
				this.hide = this.hide.bind(this);
				editor.element.addEventListener('dragenter', this.dragEnter, false);
			}
		},

		dragEnter: function(e) {
			var editor = this.editor, size = editor.element.getSize();
			if (!this.ui) {
				this.ui = new Element('div.htmlarea-image-drop', { html:'<span></span>' });
				this.mask = (new Element('div.mask')).inject(this.ui);
				this.mask.addEventListener('dragleave', this.dragLeave, false);
				this.mask.addEventListener('dragover', this.dragOver, false);
				this.mask.addEventListener('drop', this.drop, false);
				editor.fireEvent('buildImageDropPanel', { editor:editor, panel:this.ui, tool:this });
			}

			this.ui.getElement('span').set('text', this.options.dropText);
			this.ui.removeClass('progress').removeClass('error')
				.setStyles({ width:size.x, height:size.y }).inject(editor.element);
			if (this.timer) { clearTimeout(this.timer); this.timer = null; }
			editor.fireEvent('showImageDropPanel', { editor:editor, panel:this.ui, tool:this });
		},

		dragLeave: function(e) {
			this.editor.fireEvent('hideImageDropPanel', {
				editor:this.editor, panel:this.hide(), tool:this
			});
		},

		dragOver: function(e) { e.preventDefault(); e.stopPropagation(); return false; },

		drop: function(e) {
			e.preventDefault(); e.stopPropagation();
			var file = e && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0],
				name = file && file.name || '', size = file && file.size || NaN,
				error = this.image.getFileError(name, size);
			if (error) { this.uploadFailure({ error:error }); }
			else {
				this.ui.addClass('progress');
				var data = new FormData();
				data.append(this.options.uploadName, file);
				this.uploader.uploadXhr(data, this.options.uploadURL);
			}
		},

		uploadSuccess: function(data) {
			if (!data.response.upload || !data.response.upload.url) {
				data.error = 'No Url Was Returned';
				return this.uploadFailure(data);
			}

			this.image.insert(data.response.upload.url);
			this.hide();
		},

		uploadFailure: function(data) {
			var msg = data.error || 'Upload Failed';
			this.ui.removeClass('progress').addClass('error').getElement('span').set('text', msg);
			this.timer = setTimeout(this.hide, this.options.imageDropErrorTimeout);
		},

		hide: function() { return this.ui.dispose(); }
	}),


	/**
	 * Tool interface
	 **/
	title:'Add Picture', text:'<b>&#9679;</b><span>&#9728;</span>',

	setup: function(editor) {
		if (!editor.imageAction) { editor.imageAction = new this(editor); }
	},

	run: function(editor) { editor.imageAction.show(); }
});

HtmlArea.Tools.addTool('image', HtmlArea.Tools.Image);
