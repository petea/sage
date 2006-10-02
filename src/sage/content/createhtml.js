var CreateHTML = {
	HTML_SOURCE: CommonFunc.loadText("chrome://sage/content/res/template-html.txt"),
	ITEM_SOURCE: CommonFunc.loadText("chrome://sage/content/res/template-item.txt"),
	DEFAULT_CSS: "chrome://sage/content/res/sage.css",

	_tabbed: false,

	set tabbed(aValue){ this._tabbed = aValue },

	openHTML: function(feed) {
		if(!feed) return;

		try {
			var htmlURL = this.createHTML(feed);
			if(this._tabbed) {
				getContentBrowser().addTab(htmlURL);
			} else {
				getContentBrowser().loadURI(htmlURL);
			}
		} catch(e) {}
	},

	createHTML: function(feed) {
		var tmpFile = this.getSpecialDir("UChrm");
		tmpFile.appendRelativePath("sage.html");

		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
							.getService(Components.interfaces.nsIIOService);
		var xmlFilePath = ioService.newFileURI(tmpFile).spec;

		if(tmpFile.exists()) {
			tmpFile.remove(true);
		}
		tmpFile.create(tmpFile.NORMAL_FILE_TYPE, 0666);

		var stream = Components.classes['@mozilla.org/network/file-output-stream;1']
						.createInstance(Components.interfaces.nsIFileOutputStream);
		stream.init(tmpFile, 2, 0x200, false); // open as "write only"
		
		var content = this.createHTMLSource(feed);
		stream.write(content, content.length);
		stream.flush();
		stream.close();
		
		return xmlFilePath;
	},

	getUserCssURL: function() {
		var userCssEnable = CommonFunc.getPrefValue(CommonFunc.USER_CSS_ENABLE, "bool", false);
		var userCssPath = CommonFunc.getPrefValue(CommonFunc.USER_CSS_PATH, "wstr", "");
		if(!userCssEnable || !userCssPath) return null;

		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
							.getService(Components.interfaces.nsIIOService);
		var tmpFile = Components.classes['@mozilla.org/file/local;1']
							.createInstance(Components.interfaces.nsILocalFile);
		try {		
			tmpFile.initWithPath(userCssPath);
			var cssUrl = ioService.newFileURI(tmpFile);
			var contentType = ioService.newChannelFromURI(cssUrl).contentType;
			if(contentType != "text/css") return null;

			return cssUrl.spec;
		} catch(e) {
			return null;
		}
	},

	createHTMLSource: function(feed) {
		var allowEContent = CommonFunc.getPrefValue(CommonFunc.ALLOW_ENCODED_CONTENT, "bool", true);
		var twelveHourClock = CommonFunc.getPrefValue(CommonFunc.TWELVE_HOUR_CLOCK, "bool", false);
		var feedItemOrder = CommonFunc.getPrefValue(CommonFunc.FEED_ITEM_ORDER, "str", "chrono");

		var htmlSource = this.HTML_SOURCE;
		var cssUrl	= this.getUserCssURL();
		if(cssUrl) {
			htmlSource = htmlSource.replace("**CSSURL**", cssUrl);
		} else {
			htmlSource = htmlSource.replace("**CSSURL**", this.DEFAULT_CSS);
		}
		htmlSource = htmlSource.replace("**HTMLTITLE**", feed.getTitle());
		htmlSource = htmlSource.replace("**TITLE**", feed.getTitle());
		htmlSource = htmlSource.replace(/\*\*LINK\*\*/g, feed.getLink());
		htmlSource = htmlSource.replace("**DESCRIPTION**", feed.getDescription());

		var itemsSource = "";
		var items = feed.getItems(feedItemOrder);
		for(var i = 0; i < items.length; i++) {
			var link = items[i].getLink();
			var title = items[i].getTitle();
			var description = "";
			var pubDate = "";

			if(items[i].hasContent()) {
				if (allowEContent) {
					description = items[i].getContent();
				} else {
					description = htmlToText(items[i].getContent());
				}
				this.filterHtmlHandler.clear();
				this.simpleHtmlParser.parse(description);
				description = this.filterHtmlHandler.toString();
				description = "<div class=\"item-desc\">" + description + "</div>";
			}

			if(items[i].hasPubDate()) {
				pubDate = "<div class=\"item-pubDate\">" + dateFormat(items[i].getPubDate(), twelveHourClock) + "</div>";
			}

			var itemSource = this.ITEM_SOURCE;
			itemSource = itemSource.replace("**NUMBER**", i+1);
			itemSource = itemSource.replace("**LINK**", link);
			itemSource = itemSource.replace("**TECHNORATI**", encodeURIComponent(link));
			itemSource = itemSource.replace("**TITLE**", title);
			itemSource = itemSource.replace("**DESCRIPTION**", description);
			itemSource = itemSource.replace("**PUBDATE**", pubDate);
			itemsSource += itemSource;
		}
		htmlSource = htmlSource.replace("**ITEMS**", itemsSource);

		return CommonFunc.convertCharCodeFrom(htmlSource, "UTF-8");
	},

	getSpecialDir: function(aProp) {
		var dirService = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties);
		return dirService.get(aProp, Components.interfaces.nsILocalFile);
	},
	
	simpleHtmlParser:	new SimpleHtmlParser,
	filterHtmlHandler:	new FilterHtmlHandler
}

CreateHTML.simpleHtmlParser.contentHandler = CreateHTML.filterHtmlHandler;