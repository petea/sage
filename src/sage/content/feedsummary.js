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
 * Erik Arvidsson <erik@eae.net>.
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

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var strRes = new StringBundle("chrome://sage/locale/sage.properties");

var feedSummary = {

	_uri:			null,
	_feedLoader:	null,

	_ownFeedLoader:	false,

	 get uri()
	{
		if (this._uri != null)
			return this._uri;

		// parse
		var s = document.location.search.substr(1);
		var params = s.split(/&|;/);
		var parts
		for (var i = 0; i < params.length; i++)
		{
			parts = params[i].split("=");
			if (parts[0] == "uri")
				return this._uri = decodeURIComponent(parts[1]);
		}
		return null;
	},

	get feedLoader()
	{
		if (this._feedLoader != null)
			return this._feedLoader;

		// if the sidebar has the same uri then we should reuse that
		var ssb = this.findSageSideBar();
		if (ssb != null && ssb.feedLoader.uri == this.uri)
		{
			this._ownFeedLoader = false;
			return this._feedLoader = ssb.feedLoader;
		}
		this._ownFeedLoader = true;
		var fl = this.feedLoader = new FeedLoader;
		return fl
	},

	set feedLoader (fl)
	{
		if (fl != this._feedLoader)
		{
			if (this._feedLoader != null)
			{
				this._feedLoader.removeLoadListener(this._onFeedLoad);
				this._feedLoader.removeErrorListener(this._onFeedError);
				this._feedLoader.removeAbortListener(this._onFeedAbort);
			}
			this._feedLoader = fl;
		}
		return fl;
	},

	onPageLoad:	function (e)
	{
		// populate the error array
		resultStrArray = [
			strRes.getString("RESULT_OK_STR"),
			strRes.getString("RESULT_PARSE_ERROR_STR"),
			strRes.getString("RESULT_NOT_RSS_STR"),
			strRes.getString("RESULT_NOT_FOUND_STR"),
			strRes.getString("RESULT_NOT_AVAILABLE_STR"),
			strRes.getString("RESULT_ERROR_FAILURE_STR")
		];

		this.findSageSideBar();

		var uri = this.uri;

		var p = document.createElement("p");
		p.setAttribute("id", "loading-text");
		// TODO: Should look in the BM DS and find the title
		p.textContent = strRes.getFormattedString("RESULT_LOADING", [uri]);
		document.body.appendChild(p);

		var pb = document.createElementNS(XUL_NS, "progressmeter");
		pb.setAttribute("id", "loading-progress-meter");
		document.body.appendChild(pb);
		pb.setAttribute("mode", "undetermined");
		pb.setAttribute("value", "");

		document.body.setAttribute("loading", "true");


		if (uri)
			this.loadFeed(uri);

	},

	onPageUnload:	function (e)
	{
		var fl = this.feedLoader;
		fl.removeLoadListener(feedSummary.onFeedLoad);
		fl.removeErrorListener(feedSummary.onFeedError);
		fl.removeAbortListener(feedSummary.onFeedAbort);
	},

	loadFeed:	function (uri)
	{
		var fl = this.feedLoader;
		if (fl.currentFeed != null)
		{
			this.onFeedLoad(fl.currentFeed);
		}
		else
		{
			fl.addLoadListener(this.onFeedLoad);
			fl.addErrorListener(this.onFeedError);
			fl.addAbortListener(this.onFeedAbort);

			if (!fl.loading)
				fl.loadURI(uri)
		}
	},


	onFeedLoad:	function (aFeed)
	{
		var fl = feedSummary.feedLoader
		fl.removeLoadListener(feedSummary.onFeedLoad);
		fl.removeErrorListener(feedSummary.onFeedError);
		fl.removeAbortListener(feedSummary.onFeedAbort);

		// in case the sidebar started loading some other feed.
		// This should be handled in a better way.
		if (aFeed.getURI() == feedSummary.uri)
		{
			feedSummary.displayFeed(aFeed);

			document.body.removeAttribute("loading");
			document.body.removeAttribute("error");
		}
		else
		{
			feedSummary._feedLoader = null;
			feedSummary.loadFeed(feedSummary.uri);
		}
	},

	onFeedError: function (aErrorCode)
	{
		var fl = feedSummary.feedLoader
		fl.removeLoadListener(feedSummary.onFeedLoad);
		fl.removeErrorListener(feedSummary.onFeedError);
		fl.removeAbortListener(feedSummary.onFeedAbort);

		var p = document.getElementById("loading-text");
		p.textContent = strRes.getFormattedString("RESULT_ERROR", [resultStrArray[aErrorCode]]);

		var pb = document.getElementById("loading-progress-meter");
		pb.setAttribute("mode", "determined");
		pb.setAttribute("value", "100%");
		document.body.setAttribute("error", "true");
		document.body.removeAttribute("loading");
	},

	onFeedAbort: function ()
	{
		if (feedSummary._ownFeedLoader)
		{
			feedSummary.loadFeed(feedSummary.uri);
		}
		else
		{
			document.body.removeAttribute("loading");
		}
	},

	displayFeed:	function (feed)
	{
		document.title = "Sage - " + feed.getTitle();

		var s = CreateHTML.createHTMLSource(feed);

		var cssUrl	= CreateHTML.getUserCssURL();
		if (!cssUrl)
			cssUrl = CreateHTML.DEFAULT_CSS;

		var headEl = document.getElementsByTagName("head")[0];

		var linkEl = document.createElement("link");
		linkEl.setAttribute("rel", "stylesheet");
		linkEl.setAttribute("type", "text/css");
		linkEl.setAttribute("title", "standard Style");
		linkEl.setAttribute("href", cssUrl);
		headEl.appendChild(linkEl);

		/*
		// insert base tag
		var baseEl = document.createElement("base");
		baseEl.setAttribute("href", feed.getLink());
		headEl.appendChild(baseEl);
		*/

		// another hack... extract body
		var i = s.indexOf("<body>");
		var i2 = s.lastIndexOf("</body>");
		var s2 = s.substring(i, i2);

		document.body.innerHTML = s2;
	},

	findSageSideBar:	function ()
	{
		var win = this.findCurrentWindow();
		if (win)
		{
			var sageBrowser = win.document.getElementById("sidebar");
			if (sageBrowser.getAttribute("src") == "chrome://sage/content/sage.xul")
			{
				return sageBrowser.contentWindow;
			}
		}
		return null;
	},

	findCurrentWindow:	function ()
	{


		// for all windows find all browsers and all frames.
		// xul:tabbrowser . browsers

		var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
		var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator);

		var topWindowOfType = windowManagerInterface.getMostRecentWindow( "navigator:browser" );
		var wins = windowManagerInterface.getEnumerator( "navigator:browser" );
		var win, res;
		while (wins.hasMoreElements())
		{
			win = wins.getNext();
			win.QueryInterface(Components.interfaces.nsIDOMWindow);
			if ( this._findInDocument(win.document, document) )
				return win;
		}
		return null;
	},

	_findInDocument:	function (d)
	{
		var doc = d;
		if (doc == document)
			return true;

		var frames = d.defaultView.frames;
		var res, i;
		for (i = 0; i < frames.length; i++)
		{
			res = this._findInDocument(frames[i].document);
			if (res)
				return true;
		}

		var browsers = doc.getElementsByTagNameNS(XUL_NS, "browser");
		for (i = 0; i < browsers.length; i++)
		{
			res = this._findInDocument(browsers[i].contentDocument);
			if (res)
				return true;
		}

		var tabBrowsers = doc.getElementsByTagNameNS(XUL_NS, "tabbrowser");
		for (i = 0; i < tabBrowsers.length; i++)
		{
			browsers = tabBrowsers[i].browsers;
			for (j = 0; j < browsers.length; j++)
			{
				res = this._findInDocument(browsers[j].contentDocument);
				if (res)
					return true;
			}
		}

		return false;
	}

};

window.addEventListener("load", function (e)
{
	return feedSummary.onPageLoad(e);
}, false);

window.addEventListener("unload", function (e)
{
	return feedSummary.onPageUnload(e);
}, false);


// Cannot use DOM to set base
if (feedSummary.uri)
	document.write("<base href=\"" + feedSummary.uri + "\">");
