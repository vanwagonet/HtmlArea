/**
 * Namespace and base class for all items in the toolbar
 **/
HtmlArea.Tools = {
	addTools: function(o) {
		for (var name in o) { this.addTool(name, o[name]); }
		return this;
	},

	addTool: function(name, tool) {
		var Tool = HtmlArea.Tools.Tool;
		tool.tool = name;
		if (typeof tool === 'object' && !(tool instanceof Tool)) {
			tool = new Tool(tool);
		}
		this[name] = tool;
		return this;
	}
};
HtmlArea.Tools.Tool = function(o) { for (var k in o) { this[k] = o[k]; } };
HtmlArea.Tools.Tool.prototype = {
	run: function(editor, btn, e) {
		if (this.mode != editor.mode && this.mode != 'both') { return false; }
		var cmd = this.command;
		return cmd ? editor.exec(cmd, this.param, this.ui) : false;
	},
	mode: 'visual'
};

HtmlArea.Tools.addTools({
	separator:{ text:'|' },

	bold:{ title:'bold', text:'<b>B</b>', command:'bold', key:'b' },
	italic:{ title:'italic', text:'<i>I</i>', command:'italic', key:'i' },
	underline:{ title:'underline', text:'<u>U</u>', command:'underline', key:'u' },
	strike:{ title:'strike', text:'<s>S</s>', command:'strikethrough' },
	sub:{ title:'sub', text:'x<sub>2</sub>', command:'subscript' },
	sup:{ title:'sup', text:'x<sup>2</sup>', command:'superscript' },

	left:{ title:'left', text:'<hr/><hr class="odd"/><hr/><hr class="odd"/><hr/><hr class="odd"/>', command:'justifyLeft' },
	center:{ title:'center', text:'<hr/><hr class="odd"/><hr/><hr class="odd"/><hr/><hr class="odd"/>', command:'justifyCenter' },
	right:{ title:'right', text:'<hr/><hr class="odd"/><hr/><hr class="odd"/><hr/><hr class="odd"/>', command:'justifyRight' },
	justify:{ title:'justify', text:'<hr/><hr/><hr/><hr/><hr/><hr/>', command:'justifyAll' },

	bullet:{ title:'bullet', text:'<ul><li><b>&#9679;</b></li><li><b>&#9679;</b></li><li><b>&#9679;</b></li></ul>', command:'insertunorderedlist' },
	number:{ title:'number', text:'<ol><li><b>1</b></li><li><b>2</b></li><li><b>3</b></li></ol>', command:'insertorderedlist' },
	indent:{ title:'indent', text:'<hr class="full"/><hr/><hr/><hr/><hr/><hr class="full"/><b></b><b></b><b></b>', command:'indent' },
	outdent:{ title:'outdent', text:'<hr class="full"/><hr/><hr/><hr/><hr/><hr class="full"/><b></b><b></b><b></b>', command:'outdent' },
//	rule:{ title:'rule', text:'&mdash;', command:'inserthorizontalrule' }, // I don't think you should do this

//	cut:{ title:'cut', text:'&#9986;', command:'cut', key:'x', magic:true }, // execCommand('cut') doesn't seem to work
//	copy:{ title:'copy', text:'&copy;', command:'copy', key:'c', magic:true }, // execCommand('copy') doesn't seem to work
//	paste:{ title:'paste', text:'P', command:'paste', key:'v', magic:true }, // execCommand('paste') doesn't seem to work
	undo:{ title:'undo', text:'&#8617;', command:'undo', key:'z', magic:true },
	redo:{ title:'redo', text:'&#8618;', command:'redo', key:'y', magic:true },

	mode:{ title:'mode', text:'&lt;/&gt;', key:'/', mode:'both',
		run: function(editor, btn) {
			if (editor.mode === 'visual') {
				HtmlArea.Utils.addClass(btn, 'active');
				editor.setHTMLMode();
			} else {
				HtmlArea.Utils.removeClass(btn, 'active');
				editor.setVisualMode();
			}
		}
	}
});

