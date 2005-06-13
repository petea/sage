
/**
 * Feed class
 *
 */

function Feed(feedXML) {
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
		this.parseAtom();
	} else if(rootNodeName == "rss" || rootNodeName == "rdf") {
		this.parseRSS();
	} else {
		throw "Feed has invalid root element";
	}
}

Feed.prototype.parseRSS = function() {

	var feedXML = this.feedXML;

	const nsIURIFixup = Components.interfaces.nsIURIFixup;
	const URIFixup = Components.classes["@mozilla.org/docshell/urifixup;1"].getService(nsIURIFixup);

	var firstElement = feedXML.documentElement;

	if(firstElement.localName.toLowerCase() == "rdf") {
		this.feedFormat = "RSS (1.0)";
	} else if(firstElement.localName.toLowerCase() == "rss") {
		if(firstElement.hasAttribute("version")) {
			this.feedFormat = "RSS (" + firstElement.getAttribute("version") + ")";
		} else {
			this.feedFormat = "RSS (?)";
		}
	}

	var channelNode;
	for(var i = firstElement.firstChild; i != null; i = i.nextSibling) {
		if(i.nodeType != i.ELEMENT_NODE) continue;
		if(i.localName.toLowerCase() == "channel") {
			channelNode = i;
		}
	}
	if(!channelNode) {
		throw "No channel element where expected";
	}

	if(feedXML.getElementsByTagName("channel").length != 0) {
		channelNode = feedXML.getElementsByTagName("channel")[0];
	} else {
		throw "No elements in channel tag";
	}

	for(i = channelNode.firstChild; i != null; i = i.nextSibling) {
		if(i.nodeType != i.ELEMENT_NODE) continue;
		switch(i.localName) {
			case "title":
				this.title = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "link":
				this.link = CommonFunc.getInnerText(i);
				break;
			case "description":
				this.description = entityDecode(CommonFunc.getInnerText(i));
				break;
		}
	}

	var itemNodes = feedXML.getElementsByTagName("item");
	var item, guid;
	for(i = 0; itemNodes.length > i; i++) {
		item = {title:"", link:"", content:"", pubDate:""};
		guid = null;

		for(var j = itemNodes[i].firstChild; j!=null; j=j.nextSibling) {
			if(j.nodeType != j.ELEMENT_NODE) continue;
			switch(j.localName) {
				case "title":
					item.title = entityDecode(CommonFunc.getInnerText(j));
					break;
				case "link":
					if(!item.link) {
						item.link = this.link ? URIFixup.createFixupURI(this.link, nsIURIFixup.FIXUP_FLAG_NONE).resolve(CommonFunc.getInnerText(j)) : CommonFunc.getInnerText(j);
					}
					break;
				case "guid":
					if(!guid) {
						guid = CommonFunc.getInnerText(j);
					}
					break;
				case "description":
					if(!item.content) {
						item.content = CommonFunc.getInnerText(j);
					}
					break;
				case "encoded":
					item.content = CommonFunc.getInnerText(j);
					break;
				case "pubDate":
					tmp_str = CommonFunc.getInnerText(j);
					tmp_date = rfc822ToJSDate(tmp_str);
					if(tmp_date) {
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

		if(!item.link && guid) {
			item.link = this.link ? URIFixup.createFixupURI(this.link, nsIURIFixup.FIXUP_FLAG_NONE).resolve(guid) : guid;
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

Feed.prototype.parseAtom = function() {

	var feedXML = this.feedXML;

	const nsIURIFixup = Components.interfaces.nsIURIFixup;
	const URIFixup = Components.classes["@mozilla.org/docshell/urifixup;1"].getService(nsIURIFixup);

	var firstElement = feedXML.documentElement;

	if(firstElement.hasAttribute("version")) {
		this.feedFormat = "Atom (" + firstElement.getAttribute("version") + ")";
	} else {
		this.feedFormat = "Atom (?)";
	}

	for(var i = feedXML.documentElement.firstChild; i != null; i = i.nextSibling) {
		if(i.nodeType != i.ELEMENT_NODE) continue;
		switch(i.localName) {
			case "title":
				this.title = entityDecode(CommonFunc.getInnerText(i));
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
				this.description = entityDecode(CommonFunc.getInnerText(i));
				break;
		}
	}

	var entryNodes = feedXML.getElementsByTagName("entry");
	for(i = 0; entryNodes.length > i; i++) {
		var item = {title:"", link:"", content:"", pubDate:""};

		var titleNodes = entryNodes[i].getElementsByTagName("title");
		if(titleNodes.length) {
			item.title = entityDecode(CommonFunc.getInnerText(titleNodes[0]));
		}

		var linkNodes = entryNodes[i].getElementsByTagName("link");
		if(linkNodes.length) {
			for (var j = 0; j < linkNodes.length; j++) {
				if (linkNodes[j].getAttribute("rel").toLowerCase() == "alternate") {
					item.link = this.link ? URIFixup.createFixupURI(this.link, nsIURIFixup.FIXUP_FLAG_NONE).resolve(linkNodes[j].getAttribute("href")) : linkNodes[j].getAttribute("href");
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
		var contentString;
		var xmlSerializer = new XMLSerializer();
		for(j = 0; j < contentNodes.length; j++) {
			var contType = contentNodes[j].getAttribute("type");
			if(contType == "application/xhtml+xml") {
				contentString = "";
				for(z = 0; z < contentNodes[j].childNodes.length; z++) {
					contentString += xmlSerializer.serializeToString(contentNodes[j].childNodes[z]);
				}
			} else {
				contentString = CommonFunc.getInnerText(contentNodes[j]);
			}
			contentArray[contType] = contentString;
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

Feed.prototype.getItems = function(sort) {
	if(sort == "chrono" && !this.hasLastPubDate()) {  // if the feed doesn't have pub dates, we're going to do a source sort
		sort = "source";
	}
	var items_array;
	switch(sort) {
		case "chrono":
			var items = new Array();
			for(var c = 0; c < this.items.length; c++) {
				items.push(this.items[c]);
			}
			function chronoSort(a, b) {
				var a_ts = a.hasPubDate() ? a.getPubDate() : 0;
				var b_ts = b.hasPubDate() ? b.getPubDate() : 0;
				return b_ts - a_ts;
			}
			items.sort(chronoSort);
			items_array = items;
			break;
		case "source":
			items_array = this.items;
			break;
		default:
			items_array = this.items;
			break;
	}
	return items_array;
}

Feed.prototype.getFormat = function() {
	return this.feedFormat;
}

Feed.prototype.getSignature = function() {
	var hashText = "";
	for(var c = 0; c < this.getItemCount(); c++) {
		hashText += this.getItem(c).getTitle();
	}
	sig ="[" + b64_sha1(hashText) + "]";
	return sig;
}



/**
 * FeedItem class
 *
 */

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



/**
 * Utility functions
 *
 */
 
// Parses an RFC 822 formatted date string and returns a JavaScript Date object, returns null on parse error
// Example inputs:  "Sun, 08 May 05 15:19:37 GMT"  "Mon, 09 May 2005 00:50:19 GMT"
function rfc822ToJSDate(date_str) {
	date_array = date_str.split(" ");
	// check for two digit year
	if(date_array.length == 6 && date_array[3].length == 2) {
		// convert to four digit year with a pivot of 70
		if(date_array[3] < 70) {
			date_array[3] = "20" + date_array[3];
		} else {
			date_array[3] = "19" + date_array[3];
		}
	}
	date_str = date_array.join(" ");
	date = new Date(date_str);
	if(date != "Invalid Date") {
		return date;
	} else {
		return null
	}
}

// Parses an ISO 8601 formatted date string and returns a JavaScript Date object, returns null on parse error
// Example inputs:  "2004-06-17T18:00Z" "2004-06-17T18:34:12+02:00"
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

function entityDecode(aStr) {
	var	formatConverter = Components.classes["@mozilla.org/widget/htmlformatconverter;1"].createInstance(Components.interfaces.nsIFormatConverter);
	var fromStr = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
	fromStr.data = aStr;
	var toStr = { value: null };

	try {
		formatConverter.convert("text/html", fromStr, fromStr.toString().length, "text/unicode", toStr, {});
	} catch(e) {
		return aStr;
	}
	if(toStr.value) {
		toStr = toStr.value.QueryInterface(Components.interfaces.nsISupportsString);
		return toStr.toString();
	}
	return aStr;
}
