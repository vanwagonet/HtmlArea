/**
 * Manages dropping image/media from the desktop
 *
 * editor.options.dropOptions
 *  errorTimeout - (default: 3000) // ms until error message disappears
 *
 * editor.options.dropStrings
 *  drop: 'Drop to Upload' - the text to display when dragging a file over the editor
 **/
HtmlArea.Utils.Drop = function(editor, o, s) {
	var imgO = editor.options.imageOptions;
	this.editor = editor;
	this.options = HtmlArea.Utils.merge(this.options, imgO, o);
	this.strings = HtmlArea.Utils.merge(this.strings, s);
	this.setupEvents(this.options);
	this.on(editor.element, 'dragenter', this.dragEnter);
};
HtmlArea.Utils.Drop.hasFiles = function(e) {
	if (!e.dataTransfer || !e.dataTransfer.types) { return false; }
	var types = e.dataTransfer.types, t, tt = types.length;
	for (t = 0; t < tt; ++t) { if (types[t] === 'Files') { return true; } }
	return false;
};
HtmlArea.Utils.Drop.prototype = HtmlArea.Events({

	options: {
		autoLink: false,
		uploadMax: (6 * 1024 * 1024),
		uploadURL: '/upload.json',
		uploadName: 'file',
		errorTimeout: 3000
	},

	strings: {
		drop: 'Drop to Upload'
	},

	emptyGif: 'data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',

	getUI: function() {
		var ui = this.ui;
		if (!ui) {
			ui = (this.ui = document.createElement('div'));
			ui.className = 'htmlarea-drop';
			ui.innerHTML = '<label><span></span><em></em></label>';
			this.mask = document.createElement('div');
			this.mask.className = 'mask';
			ui.appendChild(this.mask);
			this.ons(this.mask, { dragleave:this.dragLeave, dragover:this.dragOver, drop:this.drop });
			this.progress = ui.querySelector('em');
			this.span = ui.querySelector('span');
			editor.fire('buildDropPanel', { editor:editor, panel:ui, tool:this });
		}
		return ui;
	},

	dragEnter: function(e) {
		if (!HtmlArea.Utils.Drop.hasFiles(e)) { return; }
		var editor = this.editor, ui = this.getUI();
		this.progress.textContent = '';
		this.span.textContent = this.strings.drop;
		HtmlArea.Utils.removeClass(ui, 'error');
		ui.width = editor.element.offsetWidth + 'px';
		ui.height = editor.element.offsetHeight + 'px';
		editor.element.appendChild(ui);
		if (this.timer) { clearTimeout(this.timer); this.timer = null; }
		editor.fire('showDropPanel', { editor:editor, panel:ui, tool:this });
	},

	dragLeave: function(e) {
		this.editor.fire('hideDropPanel', {
			editor:this.editor, panel:this.hide(), tool:this
		});
	},

	dragOver: function(e) {
		if (HtmlArea.Utils.Drop.hasFiles(e)) {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	},

	drop: function(e) {
		var URL = window.URL || window.webkitURL || {},
			files = e && e.dataTransfer && e.dataTransfer.files,
			f, ff = files.length, file, error, ui = this.getUI();
		this.editor.content.focus();
		for (f = 0; f < ff; ++f) {
			if (!(file = files[f])) { continue; }
			error = this.getFileError(file.name || '', file.size || NaN);
			if (error) {
				this.editor.fire('error', { editor:this.editor, panel:ui, tool:this, message:error });
			} else {
				var src = URL.createObjectURL && URL.createObjectURL(file) || this.emptyGif,
					data = new FormData(), id = this.insertPlaceholder(src, file.name);
				data.append(this.options.uploadName, file);
				(new HtmlArea.Utils.Upload({
					onUploadSuccess: this.bind(this.uploadSuccess, id, src),
					onUploadFailure: this.bind(this.uploadFailure, id, src)
				})).uploadXhr(data, this.options.uploadURL);
			}
		}
		this.hide();
		e.preventDefault(); e.stopPropagation();
		return false;
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

	hide: function() {
		var ui = this.getUI(), parent = ui.parentNode;
		if (parent) { parent.removeChild(ui); }
		return ui;
	},

	getFileError: function(name, size) {
		var error, max = this.options.uploadMax || (6 * 1024 * 1024);
		if (!/\.(jpg|jpeg|png|gif|bmp)$/i.test(name)) { error = 'Invalid File Format'; }
		else if (size && size > max) { error = 'Photo Is Too Large'; }
		return error;
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

