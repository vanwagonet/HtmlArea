/**
 * Namespace and base class for all items in the toolbar
 **/
HtmlArea.Tool = function() {
	HtmlArea.Widget.apply(this, arguments);
	this.button = arguments[3];
};

HtmlArea.Tool.prototype = HtmlArea.merge(new HtmlArea.Widget(), {
	run: function(e) {
		var cmd = this.command, mode = this.mode, editor = this.editor;
		if (mode != editor.mode && mode != 'both') { return false; }
		return cmd ? editor.exec(cmd) : false;
	},
	mode: 'visual',
	getTitle: function(name) {
		var title = this.strings.title || this.editor.strings[name] || name || '',
			cmd = (navigator.platform.indexOf('Mac') === 0) ? '&#8984;' : 'ctrl ';
		if (this.key) { title += ' ' + cmd + this.key.toUpperCase(); }
		return title;
	}
});


HtmlArea.Tools = {
	addTools: function(o) {
		for (var name in o) { this.addTool(name, o[name]); }
	},

	addTool: function(name, tool) {
		var Tool = HtmlArea.Tool;
		function T() { Tool.apply(this, arguments); }
		T.prototype = HtmlArea.merge(new Tool(), tool);
		return this[name] = T;
	}
};

HtmlArea.Tools.addTools({
	Separator:{},

	Bold:{ command:'bold', key:'b' },
	Italic:{ command:'italic', key:'i' },
	Underline:{ command:'underline', key:'u' },
	Strike:{ command:'strikethrough' },
	Sub:{ command:'subscript' },
	Sup:{ command:'superscript' },

	Left:{ command:'justifyLeft' },
	Center:{ command:'justifyCenter' },
	Right:{ command:'justifyRight' },
	Justify:{ command:'justifyAll' },

	Bullet:{ command:'insertunorderedlist' },
	Number:{ command:'insertorderedlist' },
	Indent:{ command:'indent' },
	Outdent:{ command:'outdent' },
//	Rule:{ command:'inserthorizontalrule' }, // I don't think you should do this

//	Cut:{ command:'cut', key:'x', magic:true }, // execCommand('cut') doesn't seem to work
//	Copy:{ command:'copy', key:'c', magic:true }, // execCommand('copy') doesn't seem to work
//	Paste:{ command:'paste', key:'v', magic:true }, // execCommand('paste') doesn't seem to work
	Undo:{ command:'undo', key:'z', magic:true },
	Redo:{ command:'redo', key:'y', magic:true },

	Mode:{ key:'/', mode:'both',
		run: function() {
			var editor = this.editor, cls = this.classes(this.button);
			if (editor.mode === 'visual') {
				cls.add('active');
				editor.setHTMLMode();
			} else {
				cls.remove('active');
				editor.setVisualMode();
			}
		}
	}
});

