
function	Feed(feedXML) {
	this.feedXML = feedXML;
	this.feedFormat = null;

	this.title = null;
	this.link = null;
	this.description = null;
	this.items = new Array();
	this.lastPubDate = null;

	if(!feedXML) {
		throw "Empty Feed";
	}

	var rootNodeName = feedXML.documentElement.localName.toLowerCase();
	if(rootNodeName == "feed") {
		this.parseATOM();
	} else {
		this.parseRSS();
	}
}

Feed.prototype.parseRSS = function() {

	var feedXML = this.feedXML;

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
				case "description":
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
}

Feed.prototype.parseATOM = function() {

	var feedXML = this.feedXML;

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
		for(i = 0; i < contentNodes.length; i++){
			var contType = contentNodes[i].getAttribute("type");
			contentArray[contType] = CommonFunc.getInnerText(contentNodes[i]);
		}

		var summaryNodes = aEntryNode.getElementsByTagName("summary");

		if("application/xhtml+xml" in contentArray) {
			item.content = contentArray["application/xhtml+xml"];
		} else if("text/html" in contentArray) {
			item.content = contentArray["text/html"];
		} else if("text/plain" in contentArray) {
			item.content = contentArray["text/plain"];
		}	else if(summaryNodes.length) {
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
}

Feed.prototype.getTitle = function() {
	return this.title;
}

Feed.prototype.getDescription = function() {
	return this.description;
}

Feed.prototype.getLink = function() {
	return this.link;
}

Feed.prototype.hasLastPubDate = function() {
	if(this.lastPubDate) {
		return true;
	} else {
		return false;
	}
}

Feed.prototype.getLastPubDate = function() {
	if(this.hasLastPubDate()) {
		return this.lastPubDate;
	} else {
		return null;
	}
}

Feed.prototype.getItemCount = function() {
	return this.items.length;
}

Feed.prototype.getItem = function(itemIndex) {
	return this.items[itemIndex];
}

Feed.prototype.getFormat = function() {
	return this.feedFormat;
}



function FeedItem(title, link, content, pubDate) {
	this.title = title;
	this.link = link;
	this.content = content;
	this.pubDate = pubDate;
}

FeedItem.prototype.hasTitle = function() {
	if(!this.title) {
		return false;
	} else {
		return true;
	}
}

FeedItem.prototype.getTitle = function() {
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
}

FeedItem.prototype.getLink = function() {
	return this.link;
}

FeedItem.prototype.hasContent = function() {
	if(!this.content) {
		return false;
	} else {
		return true;
	}
}

FeedItem.prototype.getContent = function() {
	if(this.hasContent()) {
		return this.content;
	} else {
		return "No content";
	}
}

FeedItem.prototype.hasPubDate = function() {
	if(!this.pubDate) {
		return false;
	} else {
		return true;
	}
}

FeedItem.prototype.getPubDate = function() {
	if(this.hasPubDate()) {
		return this.pubDate;
	} else {
		return null;
	}
}
