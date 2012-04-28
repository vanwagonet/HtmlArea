/**
 * Upload data from a <form> or FormData
 **/
HtmlArea.Utils.Upload = function(o) { return this.setupEvents(o); };
HtmlArea.Utils.Upload.prototype = HtmlArea.Events({

	canUploadXhr: function() { return window.File && window.FormData && window.XMLHttpRequest && true || false; },

	uploadForm: function(form) {
		return this.canUploadXhr() ?
			this.uploadXhr(new FormData(form), form.action):
			this.uploadIframe(form);
	},

	uploadXhr: function(data, url) {
		var xhr = new XMLHttpRequest(), up = this;
		xhr.onload = function(e) { up.uploadSuccess(e, xhr); };
		xhr.onabort = xhr.onerror = function(e) { up.uploadFailure(e, xhr); };
		xhr.upload.onprogress = function(e) { up.uploadProgress(e, xhr); };
		xhr.open('POST', url, true);
		xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		xhr.send(data);
		return xhr;
	},

	uploadIframe: function(form) {
		var	target = form.target, upload = this,
			iframe = document.createElement('iframe');
		function fail(e) { upload.uploadFailure(e || window.event, iframe); }
		function load(e) { upload.uploadIframeRSC(e || window.event, iframe); }
		iframe.id = iframe.name = this.getUploadIframeId();
		iframe.src = 'javascript:""';
		iframe.style.cssText = 'position:absolute;left:-9px;top:-9px;width:1px;height:1px';
		iframe = form.appendChild(iframe);
		iframe.onerror = iframe.onabort = fail;
		iframe.onload = iframe.onreadystatechange = load;
		form.target = iframe.name;
		form.submit();
		form.target = target;
	},

	getUploadIframeId: (function() {
		var counter = 0;
		return function() { return 'htmlarea_utils_upload_iframe_' + (++counter); };
	})(),

	uploadIframeRSC: function(e, iframe) {
		if (iframe.readyState && iframe.readyState !== 'loaded' && iframe.readyState !== 'complete') { return; }
		var body = iframe.contentWindow.document.body,
			mock = { responseText:(body.textContent || body.innerText) };
		this.uploadSuccess(e, mock);
		iframe.onerror = iframe.onabort = iframe.onload = iframe.onreadystatechange = null;
		iframe.parentNode.removeChild(iframe);
	},

	uploadSuccess: function(e, xhr) {
		var response, error;
		try {
			if (window.JSON && JSON.parse) { response = JSON.parse(xhr.responseText); }
			else { response = (new Function('return (' + xhr.responseText + ');'))(); }
		} catch(error) { return this.uploadFailure(e, xhr, error); }
		if (!response) { return this.uploadFailure(e, xhr, null); }
		if (response.error) { return this.uploadFailure(e, xhr, response.error); }
		this.fire('uploadSuccess', { response:response, xhr:xhr });
	},

	uploadFailure: function(e, xhr, error) {
		this.fire('uploadFailure', { error:error, event:e, xhr:xhr });
	},

	uploadProgress: function(e, xhr) {
		this.fire('uploadProgress', { event:e, xhr:xhr });
	}
});

