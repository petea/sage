var CreateHTML = {
	USER_CSS_ENABLE: "sage.user_css.enable",
	USER_CSS_PATH: "sage.user_css.path",
	ALLOW_ENCODED_CONTENT: "sage.allow_encoded_content",
	HTML_SOURCE: CommonFunc.loadText("chrome://sage/content/res/template-html.txt"),
	ITEM_SOURCE: CommonFunc.loadText("chrome://sage/content/res/template-item.txt"),
	DEFAULT_CSS: "chrome://sage/content/res/sage.css",

	_tabbed: false,

	set tabbed(aValue){ this._tabbed = aValue },

	openHTML: function(aRssObject){
		if(!aRssObject) return;

		try{
			var htmlURL = this.createHTML(aRssObject);
			if(this._tabbed){
				getContentBrowser().addTab(htmlURL);
			}else{
				getContentBrowser().loadURI(htmlURL);
			}
		}catch(e){}
	},

	createHTML: function(aRssObject){
		var tmpFile = this.getSpecialDir("UChrm");
		tmpFile.appendRelativePath("sage.html");

		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
							.getService(Components.interfaces.nsIIOService);
		var xmlFilePath = ioService.newFileURI(tmpFile).spec;

		if(tmpFile.exists()){
			tmpFile.remove(true);
		}
		tmpFile.create(tmpFile.NORMAL_FILE_TYPE, 0666);

		var stream = Components.classes['@mozilla.org/network/file-output-stream;1']
						.createInstance(Components.interfaces.nsIFileOutputStream);
		stream.init(tmpFile, 2, 0x200, false); // open as "write only"
		
		var content = this.createHTMLSource(aRssObject);
		stream.write(content, content.length);
		stream.flush();
		stream.close();
		
		return xmlFilePath;
	},

	getUserCssURL: function(){
		var userCssEnable = CommonFunc.getPrefValue(this.USER_CSS_ENABLE, "bool", false);
		var userCssPath = CommonFunc.getPrefValue(this.USER_CSS_PATH, "wstr", "");
		if(!userCssEnable || !userCssPath) return null;

		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
							.getService(Components.interfaces.nsIIOService);
		var tmpFile = Components.classes['@mozilla.org/file/local;1']
							.createInstance(Components.interfaces.nsILocalFile);
		try{		
			tmpFile.initWithPath(userCssPath);
			var cssUrl = ioService.newFileURI(tmpFile);
			var contentType = ioService.newChannelFromURI(cssUrl).contentType;
			if(contentType != "text/css") return null;

			return cssUrl.spec;
		}catch(e){
			return null;
		}
	},

	createHTMLSource: function(aRssObject){
		var allowEContent = CommonFunc.getPrefValue(this.ALLOW_ENCODED_CONTENT, "bool", false);

		var htmlSource = this.HTML_SOURCE;
		var cssUrl	= this.getUserCssURL();
		if(cssUrl){
			htmlSource = htmlSource.replace("**CSSURL**", cssUrl);
		}else{
			htmlSource = htmlSource.replace("**CSSURL**", this.DEFAULT_CSS);
		}
		htmlSource = htmlSource.replace("**HTMLTITLE**", aRssObject.title);
		htmlSource = htmlSource.replace("**TITLE**", aRssObject.title);
		htmlSource = htmlSource.replace("**LINK**", aRssObject.link);
		htmlSource = htmlSource.replace("**DESCRIPTION**", aRssObject.description);

		var itemsSource = "";
		for(var i=0; i<aRssObject.items.length; i++){
			var link = aRssObject.items[i].link;
			var title = aRssObject.items[i].title;
			
			var description = allowEContent ? aRssObject.items[i].content : aRssObject.items[i].description;

			var pubDate = aRssObject.items[i].pubDate;
	
			if(!title)
				title = "No Title";

			if(description)
				description = "<div class=\"item-desc\">" + description + "</div>";

			if(pubDate)
				pubDate = "<div class=\"item-pubDate\">" + pubDate.toLocaleString() + "</div>";

			var itemSource = this.ITEM_SOURCE;
			itemSource = itemSource.replace("**NUMBER**", i+1);
			itemSource = itemSource.replace("**LINK**", link);
			itemSource = itemSource.replace("**TITLE**", title);
			itemSource = itemSource.replace("**DESCRIPTION**", description);
			itemSource = itemSource.replace("**PUBDATE**", pubDate);
			itemsSource += itemSource;
		}
		htmlSource = htmlSource.replace("**ITEMS**", itemsSource);

		return CommonFunc.convertCharCodeFrom(htmlSource, "UTF-8");
	},

	getSpecialDir: function(aProp){
		var dirService = Components.classes['@mozilla.org/file/directory_service;1']
							.getService(Components.interfaces.nsIProperties);
		return dirService.get(aProp, Components.interfaces.nsILocalFile);
	}
}