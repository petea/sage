
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
	} else if(rootNodeName == "rss" || rootNodeName == "rdf") {
		this.parseRSS();
	} else {
		throw "Feed has invalid root element";
	}
}

Feed.prototype.parseRSS = function() {

	var feedXML = this.feedXML;

	first_element = feedXML.documentElement;

	if(first_element.localName.toLowerCase() == "rdf") {
		this.feedFormat = "RSS (1.0)";
	} else if(first_element.localName.toLowerCase() == "rss") {
		if(first_element.hasAttribute("version")) {
			this.feedFormat = "RSS (" + first_element.getAttribute("version") + ")";
		} else {
			this.feedFormat = "RSS (?)";
		}
	}

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
					if(!item.link) {
						item.link = CommonFunc.getInnerText(j);
					}
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
					tmp_str = CommonFunc.getInnerText(j);
					tmp_date = new Date(tmp_str);
					if(tmp_date != "Invalid Date") {
						item.pubDate = tmp_date;
					} else {
						logMessage("unable to parse date string: " + tmp_str + " feed: " + this.title);
					}
					break;
				case "date":
					tmp_str = CommonFunc.getInnerText(j);
					tmp_date = iso8601ToJSDate(tmp_str);
					if(tmp_date) {
						item.pubDate = tmp_date;
					} else {
						logMessage("unable to parse date string: " + tmp_str + " feed: " + this.title);
					}
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

	first_element = feedXML.documentElement;

	if(first_element.hasAttribute("version")) {
		this.feedFormat = "ATOM (" + first_element.getAttribute("version") + ")";
	} else {
		this.feedFormat = "ATOM (?)";
	}

	for(var i = feedXML.documentElement.firstChild; i != null; i = i.nextSibling) {
		if(i.nodeType != i.ELEMENT_NODE) continue;
		switch(i.localName) {
			case "title":
				this.title = CommonFunc.getInnerText(i);
				break;
			case "link":
				if(this.link) {
					if(i.getAttribute("rel").toLowerCase() == "alternate") {
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
	for(i = 0; entryNodes.length > i; i++) {
		var item = {title:"", link:"", content:"", pubDate:""};

		var titleNodes = entryNodes[i].getElementsByTagName("title");
		if(titleNodes.length) {
			item.title = CommonFunc.getInnerText(titleNodes[0]);
		}

		var linkNodes = entryNodes[i].getElementsByTagName("link");
		if(linkNodes.length) {
			for (var j = 0; j < linkNodes.length; j++) {
				if (linkNodes[j].getAttribute("rel").toLowerCase() == "alternate") {
					item.link = linkNodes[j].getAttribute("href");
					break;
				}
			}
		}

		var issuedNodes = entryNodes[i].getElementsByTagName("issued");
		if(issuedNodes.length) {
			tmp_str = CommonFunc.getInnerText(issuedNodes[0]);
			tmp_date = iso8601ToJSDate(tmp_str);
			if(tmp_date) {
				item.pubDate = tmp_date;
			} else {
				logMessage("unable to parse date string: " + tmp_str + " feed: " + this.title);
			}
		}

		var aEntryNode = entryNodes[i];

		var contentNodes = aEntryNode.getElementsByTagName("content");
		var contentArray = new Array();
		for(j = 0; j < contentNodes.length; j++){
			var contType = contentNodes[j].getAttribute("type");
			contentArray[contType] = CommonFunc.getInnerText(contentNodes[j]);
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
	return this.title.replace(/<.*?>/g,'');
}

Feed.prototype.hasDescription = function() {
	if(!this.description) {
		return false;
	} else {
		return true;
	}
}

Feed.prototype.getDescription = function() {
	if(this.hasDescription()) {
		return this.description;
	} else {
		return "";
	}
}

Feed.prototype.getLink = function() {
	return this.link;
}

Feed.prototype.hasLastPubDate = function() {
	if(!this.lastPubDate) {
		return false;
	} else {
		return true;
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

Feed.prototype.getSignature = function() {
	var sig = "[";
	for(var c = 0; c < this.getItemCount(); c++) {
		if(c != 0) sig += ",";
		sig += this.getItem(c).getTitle().length;
	}
	sig += "]";
	return sig;
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
	var title;
	if(this.hasTitle()) {
		title = this.title.replace(/<.*?>/g,'');
	} else {
		if(this.hasContent()) {
			temp = this.getContent();
			temp = temp.replace(/<.*?>/g,'');
			title = temp.substring(0, 30) + "...";
		} else {
			title = "No Title";
		}
	}
	return title;
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



/* -------------- Utility Functions ---------------- */


// Parses an ISO 8601 formatted date string and returns a JavaScript Date object, returns null on parse error
// Example inputs:  2004-06-17T18:00Z 2004-06-17T18:34:12+02:00

function iso8601ToJSDate(date_str) {
	var tmp = date_str.split("T");
	var date = tmp[0];

  date = date.split("-");
	var year = date[0];
	var month = date[1];
	var day = date[2];

	var hours = 0;
	var minutes = 0;
	var seconds = 0;
	var tz_mark = "Z";
	var tz_hours = 0;
	var tz_minutes = 0;
	var time, whole_time, tz;

	if(tmp.length == 2) {
		whole_time = tmp[1];
		tz_mark = whole_time.match("[Z+-]{1}");
		if(tz_mark) {
			tmp = whole_time.split(tz_mark);
			time = tmp[0];
			if(tz_mark == "+" || tz_mark == "-") {
				tz = tmp[1];
				tmp = tz.split(":");
				tz_hours = tmp[0];
				tz_minutes = tmp[1];
			}
		} else {
			tz_mark = "Z";
			time = whole_time;
		}
		tmp = time.split(":");
		hours = tmp[0];
		minutes = tmp[1];
		if(tmp.length == 3) {
			seconds = tmp[2];
		}
	}

	var utc = Date.UTC(year, month - 1, day, hours, minutes, seconds);
	var tmp_date;
	if(tz_mark == "Z") {
		tmp_date = new Date(utc);
	} else if(tz_mark == "+") {
		tmp_date = new Date(utc - tz_hours*3600000 - tz_minutes*60000);
	} else if(tz_mark == "-") {
		tmp_date = new Date(utc + tz_hours*3600000 + tz_minutes*60000);
	} else {
		tmp_date = "Invalid Date";
	}
	
	if (tmp_date == "Invalid Date") {
		return null;
	} else {
		return tmp_date;
	}
}