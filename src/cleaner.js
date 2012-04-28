/**
 * Takes care of normalizing and cleaning up the markup.
 **/
HtmlArea.Cleaner = {
	clean: function(ocontent) {
		var doc = document, tree = doc.createDocumentFragment(), content;
		if (ocontent.nodeType === 1) {
			content = tree.appendChild(ocontent.cloneNode(true));
		} else {
			content = tree.appendChild(doc.createElement('div'));
			content.innerHTML = String(ocontent);
		}

		// do all manipulation outside of rendered tree
		var spans = content.querySelectorAll('font,span,[style]'),
			span, t, tt = spans.length+1, font,
			styles = HtmlArea.Cleaner.styleRules,
			style, s, ss = styles.length, wrap;

		spans = Array.prototype.slice.call(spans, 0).concat(content);
		for (t = 0; t < tt; ++t) {
			style = (span = spans[t]).style.cssText.replace(/^\s+|\s+$/g, '');
			if (span.nodeName.toLowerCase() === 'font') {
				font = span;
				if (s = font.getAttribute('color')) { style += ' color: ' + s; }
				if (s = font.getAttribute('face')) { style += ' font-face: ' + s; }
				if (s = font.getAttribute('size')) { style += ' font-size: ' + s; }
				span = doc.createElement('span');
				span.style.cssText = style;
				font.parentNode.replaceChild(span, font);
				while (font.firstChild) { span.appendChild(font.firstChild); }
			}
			if (style) {
				for (s = 0; s < ss; ++s) {
					if ( ! styles[s][0].test(style)) { continue; }
					style = style.replace(styles[s][0], styles[s][1]);
					if (styles[s][2]) {
						font = doc.createElement(styles[s][2]);
						while (span.firstChild) { font.appendChild(span.firstChild); }
						span.appendChild(font);
					}
				}
				span.style.cssText = (style = style.replace(/^\s+|\s+$/g, ''));
			}
			if ( ! style && span != content && span.nodeName.toLowerCase() === 'span'
			&& ( ! span.className || span.className.toLowerCase() === 'apple-style-span')) {
				wrap = span.parentNode;
				while (span.firstChild) { wrap.insertBefore(span.firstChild, span); }
				wrap.removeChild(span);
			}
		}
		return HtmlArea.Cleaner.cleanHTML(content.innerHTML);
	},

	cleanHTML: function(html) {
		var cleanups = HtmlArea.Cleaner.tagRules,
			cleaned, c, cc = cleanups.length,
			replace = html.replace, max = 10;

		do { for (c = 0, cleaned = html; c < cc; ++c) {
			html = replace.apply(html, cleanups[c]);
		} } while (cleaned != html && --max);

		return html.replace(/^\s+|\s+$/g, '');
	},

	tagRules: [ // got this started by looking at MooRTE. Thanks Sam!
		// html tidiness
		[ /<[^> ]*/g, function(m) { return m.toLowerCase(); } ], // lowercase tags
		[ /<[^>]*>/g, function(m) {	return m
			.replace(/ [^=]+=/g, function(a) { return a.toLowerCase(); }) // lowercase attributes
			.replace(/( [^=]+=)([^"][^ >]*)/g, '$1"$2"') // quote attributes
			.replace(/ slick-uniqueid="[^"]*"/g, ''); // remove slick added attributes
		} ],
		[ /(<(?:img|input)\b[^>]*[^\/])>/g, '$1 />' ], // self close tags

		// <br/> tag cleanup
		[ /<br\b[^>]*?>/g, '<br/>' ], // normalize <br>
		[ /^<br\/>|<br\/>$/g, '' ], // no leading or trailing <br>
		[ /<br\/>\s*<\/(h1|h2|h3|h4|h5|h6|li|p|div)/g, '</$1' ], // no <br> at end of block
		[ /<p>(?:&nbsp;|\s)*<br\/>(?:&nbsp;|\s)*<\/p>/g, '<p></p>' ], // replace padded <p> with empty <p>

		// webkit cleanup
		[ / class="apple-style-span"| style=""/gi, '' ], // remove unhelpful attributes	
		[ /^([^<]+)(<?)/, '<p>$1</p>$2' ], // wrap first text in <p>
		[ /<(\/?)div\b/g, '<$1p' ], // change <div> to <p>

		// semantic changes, but prefer b, i, and s instead of strong, em, and del
		[ /<(\/?)strong\b/g, '<$1b' ], // use <b> for bold
		[ /<(\/?)em\b/g, '<$1i' ], // use <i> for italic
		[ /<(\/?)(?:strike|del)\b/g, '<$1s' ], // use <s> for strikethrough

		// normalize whitespace, tag placement
		[ /\s*<(\/?(?:p|ol|ul)\b[^>]*)>\s*/g, '<$1>\n' ], // newline after <p> </p> <ol> </ol> <ul> </ul>
		[ /\s*<li([^>]*)>/g, '\n\t<li$1>' ], // indent <li>
		[ /\s*<\/(p|ol|ul)>/g, '\n</$1>'], // newline before </p> </ol> </ul>
		[ /\s*<img\b([^>*?])>\s*/g, '\n<img$1>\n'], // <img> on its own line
		[ /<p\b[^>]*>\s*<\/p>\s*<(ol|ul)\b/g, '<$1' ], // remove empty <p> before <ul> or <ol>
		[ /(<p\b[^>]*>\s*)(<(ul|ol)\b([^<]|<)*?<\/\3>\s*)/g, '$2$1' ], // move <p> right before <ul> or <ol> to after
		[ /^\s*$/g, '' ] // no empty lines
	],

	styleRules: [
		[ /(text-decoration:.*?)\bline-through\b(;?)/gi, '$1$2', 's' ],
		[ /(text-decoration:.*?)\bunderline\b(;?)/gi, '$1$2', 'u' ],
		[ /text-decoration:\s*;/i, '' ],
		[ /font-style:\s*italic;?/gi, '', 'i' ],
		[ /font-weight:\s*bold;?/gi, '', 'b' ]
	]
};

