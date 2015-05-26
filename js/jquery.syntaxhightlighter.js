/**
 * @author Marcel Liebgott <marcel@mliebgott.de>
 * @version 1.00
 *
 * hightlight your own source code
 *
 * @require jQuery
 */
;(function($){
	var defaults = {
		path: 		"lang/",
		showLines: 	true 
	};

	$.fn.hightlighter = function(options){
		if(this.length === 0){
			return this;
		}

		// generate for each code tag an own object
		if(this.length > 1){
			this.each(function(){
				$(this).hightlighter(options);
			});

			return this;
		}

		var hightlighter = {};
		var elem = this;

		/**
		 * @author Marcel Liebgott <marcel@mliebgott.de>
		 * @since 1.00
		 *
		 * initialise some functions
		 */
		var init = function(){
			hightlighter.settings = $.extend({}, defaults, options);

			setup();
		};

		/**
		 * @author Marcel Liebgott <marcel@mliebgott.de>
		 * @since 1.00
		 *
		 * get some information from the current code block
		 */
		var setup = function(){
			$.each(elem, function(){
				var lang = $(this).attr('class');
				var content = $(this).html();
				var title = $(this).data('title');

				var param = {
					content: 	content,
					title: 		title, 
				};

				$(this).text("");

				readXmlFile(lang, hightlight, param);
			});
		};

		/**
		 * @author Marcel Liebgott <marcel@mliebgott.de>
		 * @since 1.00
		 *
		 * read the given language xml file
		 */
		var readXmlFile = function(lang, callback, param){
			if(lang !== null && lang !== "" && typeof lang !== 'undefined'){
				var pathToXml = hightlighter.settings.path + lang + ".xml";

				$.ajax({
					type: 		"GET", 
					url: 		pathToXml, 
					dataType: 	"xml", 
					success: 	function(xml){
						callback($(xml), param);
					},
					error: 		function(error) {
  						console.log("some error: " + error);
					}
				});
			}
		};

		/**
		 * @author Marcel Liebgott <marcel@mliebgott.de>
		 * @since 1.00
		 *
		 * convert into hightlighted code by given language
		 */
		var hightlight = function(xml, param){
			XmlToArray(xml);
			var content, identifiers = "";

			if(hightlighter.identifiers.length > 0){
				identifiers = '(?!' + escapeSpecialCharacters(hightlighter.identifiers.join('|')) + '{1,2})';
			}

			if(param.content !== null && param.content !== ""){
				content = param.content;

				// replace operators
				var operators = '^(';
				$.each(hightlighter.operations, function(key, value){
					operators += escapeSpecialCharacters(value) + '|';
				});

				operators = operators.substring(0, operators.length - 1) + ')$';
				var operationRegex = new RegExp(operators, 'g');
				var style = prepareStyleAttribute(hightlighter.design.operation);

				content = content.replace(operationRegex, '<span style="' + style + '">$1</span>');

				// replace keywords
				$.each(hightlighter.keywords, function(key, value){
					var keywordRegex = new RegExp('\\b(' + identifiers + value + ')\\b', 'g');
					var style = prepareStyleAttribute(hightlighter.design.keyword);

					content = content.replace(keywordRegex, function(match){
						return clearSpans(match, style);
					});
				});

				// replace functions
				$.each(hightlighter.functions, function(key, value){
					var functionRegex = new RegExp('\\b(' + identifiers + value + ')\\b', 'g');
					var style = prepareStyleAttribute(hightlighter.design.function);

					content = content.replace(functionRegex, '<span style="' + style + '">' + value + '</span>');
				});

				// replace constants
				$.each(hightlighter.constants, function(key, value){
					var constantRegex = new RegExp('\\b' + value + '\\b', 'g');
					var style = prepareStyleAttribute(hightlighter.design.constant);

					content = content.replace(constantRegex, '<span style="' + style + '">' + value + '</span>');
				});

				// single line comments
				$.each(hightlighter.sc, function(key, value){
					var scRegex = new RegExp('((?!([^<]+)?>)' + value + '.+?\\n)', 'g');
					var style = prepareStyleAttribute(hightlighter.design.sc);

					content = content.replace(scRegex, function(match){
						return clearSpans(match, style);
					});
				});

				// multi line comments
				$.each(hightlighter.mc, function(key, value){
					var _regex = "(";
					var i = 0;
					var style = prepareStyleAttribute(hightlighter.design.mc);

					if(value.length == 2){
						for(mc in value){
							_regex += escapeSpecialCharacters(value[mc]);

							if(i == 0){
								_regex += '[\\S\\s]*?';
							}

							i++;
						}
					}

					_regex += ')';

					var mcRegex = new RegExp(_regex, 'g');

					content = content.replace(mcRegex, function(match){
						return clearSpans(match, style);
					});
				});

				// highlight identifiers
				$.each(hightlighter.identifiers, function(key, value){
					if(hightlighter.identifiers.length > 0){
						var _identifiers = escapeSpecialCharacters(hightlighter.identifiers.join('|'));

						// detect identifiers which have some html code inside
						var detectIdentifiersRegex = new RegExp(_identifiers + '{1,2}\<.*\>([_a-zA-Z][_a-zA-Z0-9]*)\<.*\>\\s', 'g');

						if(detectIdentifiersRegex.test(content)){
							// remove html inside of each match
							$.each(content.match(detectIdentifiersRegex), function(key, value){
								var replaced = value.replace(/<.*?>/g, '');
								replaced = replaced.replace(/<\/.*?>/g, '');
								content = content.replace(value, replaced);
							});

							var identifierRegex = new RegExp('(' + _identifiers + '{1,2})([_a-zA-Z][_a-zA-Z0-9]*)', 'g');
							var style = prepareStyleAttribute(hightlighter.design.identifier);

							content = content.replace(identifierRegex, function(match){
								return clearSpans(match, style);
							});
						}
					}
				});

				// hightlight strings
				$.each(hightlighter.strings, function(key, value){
					value = escapeSpecialCharacters(value);
					var stringRegex = new RegExp(value + '([_a-zA-Z][_a-zA-Z0-9]*)' + value, 'g');
					var style = prepareStyleAttribute(hightlighter.design.string);

					content = content.replace(stringRegex, '<span style="' + style + '">' + value + '$1' + value + '</span>')
				});
			}

			// convert it to an ordered list
			content = content.split(/\n|<br>/);

			// remove first and last line if their empty
			if(content[0] === ""){
				content = content.slice(1, -1);
			}

			if(content[content.length] === ""){
				content = content.slice(content.length, -1);
			}

			var li = $('<ol></ol>');

			// does this source code have a title
			if(param.title !== null && param.title !== "" && typeof param.title !== 'undefined'){
				li.append('<li class="hightlighter-title">' + param.title + '</li>');
			}

			$.each(content, function(key, value){
				// if this line is empty
				if(value === ''){
					value = "&nbsp;";
				}

				value = value.replace(/(\r\n|\n|\r)/g, '<br>');
				value = value.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
				var list_content = '<li>' + value + '</li>';

				li.append(list_content);
			});

			// show line numbers
			if(hightlighter.settings.showLines){
				li.addClass('hightlighter-line-numbers');
			}else{
				li.addClass('hightlighter-no-line-numbers');
			}

			// highlight/mark lines
			if(hightlighter.settings.mark !== null){
				li = markLines(hightlighter.settings.mark, li);
			}

			$(elem).html(li);
		};

		/**
		 * @author Marcel Liebgott <marcel@mliebgott.de>
		 * @since 1.00
		 *
		 * convert the content of the code block into an array
		 */
		var XmlToArray = function(xml){
			// get the identifier to detect variables
			hightlighter.identifiers = [];
			$(xml).find('identifier').each(function(){
				if($(this).text() !== ""){
					hightlighter.identifiers.push($(this).text());
				}
			});

			// keywords
			hightlighter.keywords = [];
			$(xml).find('keyword').each(function(){
				hightlighter.keywords.push($(this).text());
			});

			// single line comments
			hightlighter.sc = [];
			$(xml).find('singleLineComments').children().each(function(){
				hightlighter.sc.push($(this).text());
			});

			// multi line comments
			hightlighter.mc = [];
			$(xml).find('multiLineComment').each(function(){
				hightlighter.mc.push([
					$(this).attr('begin'),
					$(this).attr('end')
				]);
			});

			// operations
			hightlighter.operations = [];
			$(xml).find('operation').each(function(){
				hightlighter.operations.push($(this).text());
			});

			// functions
			hightlighter.functions = [];
			$(xml).find('function').each(function(){
				hightlighter.functions.push($(this).text());
			});

			// constants
			hightlighter.constants = [];
			$(xml).find('constant').each(function(){
				hightlighter.constants.push($(this).text());
			});

			// strings
			hightlighter.strings = [];
			$(xml).find('string').each(function(){
				hightlighter.strings.push($(this).text());
			});

			// design
			hightlighter.design = [];

			// keyword
			hightlighter.design.keyword = [];
			$(xml).find('design[type="keyword"]').each(function(){
				var name = $(this).attr('name');
				var value = $(this).attr('value');
				
				hightlighter.design.keyword[name] = value;
			});

			// single line comment
			hightlighter.design.sc = [];
			$(xml).find('design[type="sc"]').each(function(){
				var name = $(this).attr('name');
				var value = $(this).attr('value');
				
				hightlighter.design.sc[name] = value;
			});

			// multi line comment
			hightlighter.design.mc = [];
			$(xml).find('design[type="mc"]').each(function(){
				var name = $(this).attr('name');
				var value = $(this).attr('value');
				
				hightlighter.design.mc[name] = value;
			});

			// operations
			hightlighter.design.operation = [];
			$(xml).find('design[type="operation"]').each(function(){
				var name = $(this).attr('name');
				var value = $(this).attr('value');
				
				hightlighter.design.operation[name] = value;
			});

			// identifiers
			hightlighter.design.identifier = [];
			$(xml).find('design[type="identifier"]').each(function(){
				var name = $(this).attr('name');
				var value = $(this).attr('value');
				
				hightlighter.design.identifier[name] = value;
			});

			// functions
			hightlighter.design.function = [];
			$(xml).find('design[type="function"]').each(function(){
				var name = $(this).attr('name');
				var value = $(this).attr('value');

				hightlighter.design.function[name] = value;
			});

			// constants
			hightlighter.design.constant = [];
			$(xml).find('design[type="constant"]').each(function(){
				var name = $(this).attr('name');
				var value = $(this).attr('value');

				hightlighter.design.constant[name] = value;
			});

			// strings
			hightlighter.design.string = [];
			$(xml).find('design[type="string"]').each(function(){
				var name = $(this).attr('name');
				var value = $(this).attr('value');

				hightlighter.design.string[name] = value;
			});
		};

		/**
		 * @author Marcel Liebgott <marcel@mliebgott.de>
		 * @since 1.00
		 *
		 * hightlight/mark given lines
		 */
		var markLines = function(marks, content){
			if(marks == null || content == null){
				return;
			}

			var lines = marks.split(',');

			for(idx in lines){
				$.each(content.find('li'), function(key, value){
					if(lines[idx] == key){
						$(this).addClass('hightlighter-mark-line');
					}
				});
			};

			return content;
		};

		/**
		 * @author Marcel Liebgott <marcel@mliebgott.de>
		 * @since 1.00
		 *
		 * get defined style information for this current code-element
		 */
		function prepareStyleAttribute(data){
			var style = "";

			for(key in data){
				style += key + ": " + data[key] + ";";
			}

			return style;
		};

		/**
		 * @author Marcel Liebgott <marcel@mliebgott.de>
		 * @since 1.00
		 *
		 * escape special characters
		 */
		function escapeSpecialCharacters(str){
			return str.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
		};

		/**
		 * @author Marcel Liebgott <marcel@mliebgott.de>
		 * @since 1.00
		 *
		 * clean up span elements because comments could be keywords to
		 */
		function clearSpans(match, style){
			match = match.replace(/<span.*?>/g, "");
			match = match.replace(/<\/span>/g, "");

			// find any line breaks
			var _match = false;
			if((/(\r\n|\n|\r)/g).test(match)){
				_match = true;

				match = match.trim();
			}

			if(_match){
				// rebuild styling while line breaks
				var arr = match.split(/(\r\n|\n|\r)/g);

				if(arr.length > 1){
					var style = prepareStyleAttribute(hightlighter.design.mc);
					var res = "";

					$.each(arr, function(key, value){
						var emptyLine = isEmptyLine(value);

						if(value !== "" && !emptyLine){
							value = value.replace(' ', '&nbsp;');
							res += '<span style="' + style + '">' + value + '</span>';
						}else{
							res += "\n";
						}
					});

					match = res;

					return match;
				}

				match = match.replace(' ', ' ');

				// replace all line breaks
				match = match.replace(/(\r\n|\n|\r)/g, '__BR__');
			}

			var ret = '<span style="' + style + '">' + match + '</span>' + (_match ? '\n' : '');
			ret = ret.replace(/__BR__/g, '<br>');

			return ret;
		};

		/**
		 * @author Marcel Liebgott <marcel@mliebgott.de>
		 * @since 1.00
		 *
		 * check if the given line is empty or is a 'whitespace' string
		 */
		function isEmptyLine(str){
			str = str.replace(' ', '');
			var res = str.trim();
			return (res == "" ? true : false);
		};

		// let's go! :)
		init();

		return this;
	};
})(jQuery);