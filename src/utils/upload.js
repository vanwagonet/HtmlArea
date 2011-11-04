/**
 * Upload data from a <form> or FormData
 **/
HtmlArea.Utils.Uploader = new Class({

	Implements: [ Events, Options ],

	initialize: function(o) {
		this.setOptions(o);
	},

	canUploadXhr: function() { return window.File && window.FormData && window.XMLHttpRequest && true || false; },

	uploadForm: function(form) {
		return this.canUploadXhr() ?
			this.uploadXhr(new FormData(form), form.action):
			this.uploadIframe(form);
	},

	uploadXhr: function(data, url) {
		var xhr = new XMLHttpRequest();
		xhr.onload = this.uploadSuccess.bind(this, xhr);
		xhr.onabort = xhr.onerror = this.uploadFailure.bind(this, xhr);
		xhr.upload.onprogress = this.uploadProgress.bind(this, xhr);
		xhr.open('POST', url, true);
		xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		xhr.send(data);
		return xhr;
	},

	uploadIframe: function(form) {
		this.bindUploadHandlers();
		var	target = form.get('target'),
			iframe = new Element('iframe', { name:this.getUploadIframeId(), src:'javascript:""' }),
			load = this.uploadIframeRSC.bind(this, iframe),
			fail = this.uploadFailure.bind(this, iframe);
		iframe.inject(form, 'after').addEvents({
			error:fail, abort:fail, load:load, readystatechange:load
		});
		form.set('target', iframe.name).submit();
		form.set('target', target);
	},

	getUploadIframeId: (function() { return 'htmlarea_utils_upload_iframe_' + (++this.counter); }).bind({ counter:0 }),

	uploadIframeRSC: function(iframe, e) {
		if (iframe.readyState && iframe.readyState !== 'loaded' && iframe.readyState !== 'complete') { return; }
		var body = iframe.contentWindow.document.body,
			mock = { responseText:(body.textContent || body.innerText) };
		this.uploadSuccess(mock, e);
		iframe.destroy();
	},

	uploadSuccess: function(xhr, e) {
		var response, error;
		try { response = JSON.decode(xhr.responseText); }
		catch(error) { return this.uploadFailure(xhr, e, error); }
		if (!response) { return this.uploadFailure(xhr, e, null); }
		if (response.error) { return this.uploadFailure(xhr, e, response.error); }
		this.fireEvent('uploadSuccess', { response:response, xhr:xhr });
	},

	uploadFailure: function(xhr, e, error) {
		this.fireEvent('uploadFailure', { error:error, event:e, xhr:xhr });
	},

	uploadProgress: function(xhr, e) {
		this.fireEvent('uploadProgress', { event:e, xhr:xhr });
	}
});
