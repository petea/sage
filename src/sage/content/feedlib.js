var Feed = {

	feedXML: null,
	feedFormat: null,

	title: null,
	link: null,
	description: null,  
	items: new Array(),
  lastPubDate: null,


	Feed: function(feedXML) {
		this.feedXML = feedXML;

		if(!feedXML) {
			throw "Empty Feed";
		}

		var rootNodeName = feedXML.documentElement.localName.toLowerCase();
		if(rootNodeName == "feed") {
			this.parseATOM();
		} else {
			this.parseRSS();
		}
	},

	parseRSS: function() {

		feedXML = this.feedXML;

		this.feedFormat = "RSS";

		var channelNode;
		if(feedXML.getElementsByTagName("channel").length != 0) {
			channelNode = feedXML.getElementsByTagName("channel")[0];
		} else {
			throw "No elements in channel tag";
		}

		for(var i = channelNode.firstChild; i != null; i = i.nextSibling) {
			if(i.nodeType != i.ELEMENT_NODE) continue;
			switch(i.localName) {
				case "title":
					this.title = CommonFunc.getInnerText(i);
					break;
				case "link":
					this.link = CommonFunc.getInnerText(i);
					break;
				case "description":
					this.description = CommonFunc.getInnerText(i);
					break;
			}
		}

		var itemNodes = feedXML.getElementsByTagName("item");
		for(i = 0; itemNodes.length > i; i++) {
			var item = {title:"", link:"", content:"", pubDate:""};

			for(var j = itemNodes[i].firstChild; j!=null; j=j.nextSibling) {
				if(j.nodeType != j.ELEMENT_NODE) continue;
				switch(j.localName) {
					case "title":
						item.title = CommonFunc.getInnerText(j);
						break;
					case "link":
						item.link = CommonFunc.getInnerText(j);
						break;
					case "guid":
						if(!item.link) {
							item.link = CommonFunc.getInnerText(j);
						}
						break;
					case "encoded":
						item.content = CommonFunc.getInnerText(j);
						break;
					case "pubDate":
						item.pubDate = new Date(CommonFunc.getInnerText(j));
						break;
					case "date":
						tmp_str = CommonFunc.getInnerText(j);
						tmp_date = new Date();
						tmp_date.setUTCFullYear(tmp_str.substring(0,4));
						tmp_date.setUTCMonth(tmp_str.substring(5,7) - 1);
						tmp_date.setUTCDate(tmp_str.substring(8,10));
						tmp_date.setUTCHours(tmp_str.substring(11,13));
						tmp_date.setUTCMinutes(tmp_str.substring(14,16));
						tmp_date.setUTCSeconds(tmp_str.substring(17,19));
						item.pubDate = new Date(tmp_date);
						break;
				}
			}

			var tmpFeedItem = new FeedItem(item.title, item.link, item.content, item.pubDate);

			if(tmpFeedItem.hasPubDate()) {
				if(tmpFeedItem.getPubDate() > this.lastPubDate) {
					this.lastPubDate = tmpFeedItem.getPubDate();
				}
			}

			this.items.push(tmpFeedItem);
		}
	},

	parseATOM: function() {

		feedXML = this.feedXML;

		this.feedFormat = "ATOM";

		for(var i = feedXML.documentElement.firstChild; i != null; i = i.nextSibling){
			if(i.nodeType != i.ELEMENT_NODE) continue;
			switch(i.localName){
				case "title":
					this.title = CommonFunc.getInnerText(i);
					break;
				case "link":
					if(this.link) {
						if(i.getAttribute("rel").toLowerCase() == "alternate"){
							this.link = i.getAttribute("href");
						}
					} else {
						this.link = i.getAttribute("href");
					}
					break;
				case "tagline":
					this.description = CommonFunc.getInnerText(i);
					break;
			}
		}

		var entryNodes = feedXML.getElementsByTagName("entry");
		for(i = 0; entryNodes.length > i; i++){
			var item = {title:"", link:"", content:"", pubDate:""};

			var titleNodes = entryNodes[i].getElementsByTagName("title");
			if(titleNodes.length) {
				item.title = CommonFunc.getInnerText(titleNodes[0]);
			}

			var linkNodes = entryNodes[i].getElementsByTagName("link");
			if(linkNodes.length) {
				for (j = 0; j < linkNodes.length; j++) {
					if (linkNodes[j].getAttribute("rel") == "alternate") {
						item.link = linkNodes[j].getAttribute("href");
						break;
					}
				}
			}

			var issuedNodes = entryNodes[i].getElementsByTagName("issued");
			if(issuedNodes.length) {
				tmp_str = CommonFunc.getInnerText(issuedNodes[0]);
				tmp_date = new Date();
				tmp_date.setUTCFullYear(tmp_str.substring(0,4));
				tmp_date.setUTCMonth(tmp_str.substring(5,7) - 1);
				tmp_date.setUTCDate(tmp_str.substring(8,10));
				tmp_date.setUTCHours(tmp_str.substring(11,13));
				tmp_date.setUTCMinutes(tmp_str.substring(14,16));
				tmp_date.setUTCSeconds(tmp_str.substring(17,19));
				item.pubDate = new Date(tmp_date);
			}

			var aEntryNode = entryNodes[i];

			var contentNodes = aEntryNode.getElementsByTagName("content");
			var contentArray = new Array();
			for(var i=0; i<contentNodes.length; i++){
				var contType = contentNodes[i].getAttribute("type");
				contentArray[contType] = CommonFunc.getInnerText(contentNodes[i]);
			}

			var summaryNodes = aEntryNode.getElementsByTagName("summary");

			if("application/xhtml+xml" in contentArray) {
				item.content = contentArray["application/xhtml+xml"];
			} elseif("text/html" in contentArray) {
				item.content = contentArray["text/html"];
			} elseif("text/plain" in contentArray) {
				item.content = contentArray["text/plain"];
			}	elseif(summaryNodes.length) {
				item.content = CommonFunc.getInnerText(summaryNodes[0]);
			}
			
			var tmpFeedItem = new FeedItem(item.title, item.link, item.content, item.pubDate);

			if(tmpFeedItem.hasPubDate()) {
				if(tmpFeedItem.getPubDate() > this.lastPubDate) {
					this.lastPubDate = tmpFeedItem.getPubDate();
				}
			}

			this.items.push(tmpFeedItem);
		}
	},

	getTitle: function() {
		return this.title;
	}

	getDescription: function() {
		return this.description;
	}

	getLink: function() {
		return this.link;
	}

	hasLastPubDate: function() {
		if(this.lastPubDate) {
			return true;
		} else {
			return false;
		}
	}

	getLastPubDate: function() {
		if(this.hasLastPubDate()) {
			return this.lastPubDate;
		} else {
			return null;
		}
	},

	getItemCount: function() {
		return this.items.length;
	},

	getItem: function(itemIndex) {
		return this.items[itemIndex];
	},

	getFormat: function() {
		return this.feedFormat;
	},

}


var FeedItem = {

	title: null,
	link: null,
	content: null,
  pubDate: null,

	FeedItem: function(title, link, content, pubDate) {
		this.title = title;
		this.link = link;
		this.content = content;
		this.pubDate = pubDate;
	},

	hasTitle: function() {
		if(!this.title) {
			return false;
		} else {
			return true;
		}
	},

	getTitle: function() {
		if(this.hasTitle()) {
			return this.title;
		} else {
			if(this.hasContent()) {
				temp = this.getContent();
				temp.replace(/<.*?>/g,'');
				return temp.substring(0, 30) + "...";
			} else {
				return "No Title";
			}
		}
	},

	getLink: function() {
		return this.link;
	},

	hasContent: function() {
		if(this.content) {
			return true;
		} else {
			return false;
		}
	},

	getContent: function() {
		if(this.hasContent()) {
			return this.content;
		} else {
			return "No content";
		}
	},

	hasPubDate: function() {
		if(this.pubDate) {
			return true;
		} else {
			return false;
		}
	},

	getPubDate: function() {
		if(this.hasPubDate()) {
			return this.pubDate;
		} else {
			return null;
		}
	},

}