/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Sage.
 *
 * The Initial Developer of the Original Code is
 * Peter Andrews <petea@jhu.edu>.
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Peter Andrews <petea@jhu.edu>
 * Erik Arvidsson <erik@eae.net>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

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
		} catch(e) {
			dump(e);
		}
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
		htmlSource = htmlSource.replace("**AUTHOR**", feed.getAuthor());
		htmlSource = htmlSource.replace("**DESCRIPTION**", feed.getDescription());
		htmlSource = htmlSource.replace("**LOGOLINK**", feed.getLogo().link);
		htmlSource = htmlSource.replace("**LOGOALT**", feed.getLogo().alt);

		var footer = feed.getFooter();
		htmlSource = htmlSource.replace("**COPYRIGHT**", footer.copyright);
		htmlSource = htmlSource.replace("**GENERATOR**", footer.generator);
		var editor = "";
		var webmaster = "";
		if (footer.editor) {
			editor = "<a href=\"mailto:" + footer.editor + "\">Editor</a>";
			if (footer.webmaster)
				editor += ", ";
		}
		htmlSource = htmlSource.replace("**EDITOR**", editor);

		// TODO: localizations
		if (footer.webmaster) {
			webmaster = "<a href=\"mailto:" + footer.webmaster + "\">Webmaster</a>";
		}
		htmlSource = htmlSource.replace("**WEBMASTER**", webmaster);

		var itemsSource = "";
		var items = feed.getItems(feedItemOrder);
		for(var i = 0; i < items.length; i++) {
			var link = items[i].getLink();
			var title = items[i].getTitle();
			var author = items[i].getAuthor();
			var enclosure = "";
			var description = "";
			var pubDate = "";

			if(items[i].hasContent()) {
				description = allowEContent ? items[i].getContent() : htmlToText(items[i].getContent());
				description = "<div class=\"item-desc\">" + description + "</div>";
			}

			// TODO: localizations
			if(items[i].hasAuthor()) {
				author = "<div class=\"item-author\">By " + author + "</div>";
			}

			if(items[i].hasPubDate()) {
				pubDate = "<div class=\"item-pubDate\">" + dateFormat(items[i].getPubDate(), twelveHourClock) + "</div>";
			}

			if(items[i].hasEnclosure()) {
				var tmp = items[i].getEnclosure();
				enclosure = "<div class=\"item-enclosure\">" +
					// TODO: localizations
					"<a href=\"" + tmp.getLink() + "\" title=\"Enclosure\">" +
					"<img src=\"" +
					(tmp.hasMimeType() ?
						"moz-icon://goat?size=16&contentType=" + tmp.getMimeType() :
						"chrome://sage/skin/enclosure.png") +
					"\"></a> " +
					(tmp.getDesc() ? tmp.getDesc() + ", " : "") +
					tmp.getSize() + "</div>";
			}

			var itemSource = this.ITEM_SOURCE;
			itemSource = itemSource.replace("**NUMBER**", i+1);
			itemSource = itemSource.replace("**LINK**", link);
			itemSource = itemSource.replace("**TECHNORATI**", encodeURIComponent(link));
			itemSource = itemSource.replace("**TITLE**", title);
			itemSource = itemSource.replace("**AUTHOR**", author);
			itemSource = itemSource.replace("**DESCRIPTION**", description);
			itemSource = itemSource.replace("**PUBDATE**", pubDate);
			itemSource = itemSource.replace("**ENCLOSURE**", enclosure);
			itemsSource += itemSource;
		}
		htmlSource = htmlSource.replace("**ITEMS**", itemsSource);

		return CommonFunc.convertCharCodeFrom(htmlSource, "UTF-8");
	},

	getSpecialDir: function(aProp) {
		var dirService = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties);
		return dirService.get(aProp, Components.interfaces.nsILocalFile);
	}
}
