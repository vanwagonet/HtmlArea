# Inkwall's HtmlArea

This is Inkwall's HtmlArea. Here's what I hope you find:

1. Super easy to use. I want to step out of the pattern of Office 95 wannabes, without making you have to think twice about how to do something.
2. Lightweight. You shouldn't have to wait for lots of files to load up when all you want to do is fix a typo in your blog post. HtmlArea should stay out of your way.
3. Extensible. If you are blogger on Inkwall, you probably don't care at all, but I had a terrible experience trying to reskin and add features to other editors, and I don't want other programmer to have to go through that.
While I certainly hope it works for you, I don't aim for the broad compatibility many editors claim. If you aren't using the latest version of a popular browser, you have bigger problems to worry about than any bug you find in HtmlArea.

*I'm not done yet.*

While I'm excited about what I've got so far, the best is yet to come. If you find problems, let me know about it. Also, let me know what you'd like to see. Here's what Dennis and I have in mind:

* Select from preset styles, so you can focus on your content, while we make it look good.


## Specifics

### Browser Compatibility

If you find a bug in HtmlArea while using the latest version of Chrome, Safari, Firefox, or Internet Explorer, I'd like to fix it... perhaps Opera if the bug is nasty, and you ask me real nice like.


### Requirements

HtmlArea has no external dependencies. The code base is in vanilla javascript.


### Usage

	var htmlarea = new HtmlArea(content, options);

content may be any div or textarea. It will be wrapped with a div.

options is an object with any of the following properties

* name - deafults to 'content' - String name attribute to add to the generated textarea, only used if a textarea was not passed in as content
* style - defaults to 'default' - css class name appended to the wrapper div, designates the theme to use
* mode - defaults to 'visual' - may also be 'html' signifying the editor starts by showing raw html
* toolsgo - defaults to 'top' - may also be 'bottom' denoting where in the wrapper the toolbar should be added
* tools - defaults to '[bold,italic,underline,strike]|[sub,sup|left,center,right]|[bullet,number,indent,outdent]|[link,image,mode]' - an array or string denoting the actions to add to the toolbar
* * [] denotes a group, wrapped in span.tools
* * | is a shortcut for separator


## License

The code is available under the MIT License. If you find it useful, send me shout out.

Copyright (c) 2011 Andy VanWagoner

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
