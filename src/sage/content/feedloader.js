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

function FeedLoader()
{
	this.loadListeners = [];
	this.errorListeners = [];
	this.abortListeners = [];
}

FeedLoader.prototype = {
	uri:			null,
	currentFeed:	null,
	loading:		false,

	addLoadListener:	function (f)
	{
		this._addListener("loadListeners", f);
	},

	removeLoadListener:	function (f)
	{
		this._removeListener("loadListeners", f);
	},

	addErrorListener:	function (f)
	{
		this._addListener("errorListeners", f);
	},

	removeErrorListener:	function (f)
	{
		this._removeListener("errorListeners", f);
	},

	addAbortListener:	function (f)
	{
		this._addListener("abortListeners", f);
	},

	removeAbortListener:	function (f)
	{
		this._removeListener("abortListeners", f);
	},

	_addListener:	function (n, f)
	{
		var found = false;
		for (var i = 0; i < this[n].length; i++)
		{
			if (this[n][i] == f)
			{
				found = true;
				break;
			}
		}
		if (!found)
			this[n].push(f);
	},

	_removeListener:	function (n, f)
	{
		for (var i = 0; i < this[n].length; i++)
		{
			if (this[n][i] == f)
			{
				this[n].splice(i,1);
				return;
			}
		}
	},

	_callListeners:	function (n, arg)
	{
		for (var i = 0; i < this[n].length; i++)
		{
			this[n][i].call(this, arg);
		}
	},

	loadURI:	function (aURI)
	{
		if (this.loading)
		{
			this.abort();
		}

		this.httpReq = new XMLHttpRequest();
		this.httpReq.open("GET", aURI);
		this.uri = aURI;

		var oThis = this;
		this.httpReq.onload = function (e) { return oThis.onHttpLoaded(e); };
		this.httpReq.onerror = function (e) { return oThis.onHttpError(e); };
		this.httpReq.onreadystatechange = function (e) { return oThis.onHttpReadyStateChange(e); };

		try
		{
			this.httpReq.setRequestHeader("User-Agent", CommonFunc.USER_AGENT);
			this.httpReq.overrideMimeType("application/xml");
		}
		catch (e)
		{
			this.httpGetResult(CommonFunc.RESULT_ERROR_FAILURE);
		}

		try
		{
			this.httpReq.send(null);
			this.loading = true;
			this.currentFeed = null;
		}
		catch (e)
		{
			this.httpGetResult(CommonFunc.RESULT_ERROR_FAILURE);
		}
	},

	abort:	function ()
	{
		if (this.httpReq && this.loading)
		{
			this.httpReq.abort();
			this.loading = false;
			this._callListeners("abortListeners");
		}
	},

	onHttpError:	function (e)
	{
		logMessage("HTTP Error: " + e.target.status + " - " + e.target.statusText);
		this.httpGetResult(CommonFunc.RESULT_NOT_AVAILABLE);
	},

	onHttpReadyStateChange:	function (e)
	{
		if (this.httpReq.readyState == 2)
		{
			try
			{
				if (this.httpReq.status == 404)
				{
					this.httpGetResult(CommonFunc.RESULT_NOT_FOUND);
				}
			}
			catch (e)
			{
				this.httpGetResult(CommonFunc.RESULT_NOT_AVAILABLE);
				return;
			}
		}
		//else if (this.httpReq.readyState == 3) {}
	},

	onHttpLoaded:	function (e)
	{
		this.responseXML = this.httpReq.responseXML;
		var rootNodeName = this.responseXML.documentElement.localName.toLowerCase();

		switch (rootNodeName)
		{
			case "parsererror":
				// XML Parse Error
				this.httpGetResult(CommonFunc.RESULT_PARSE_ERROR);
				break;
			case "rss":
			case "rdf":
			case "feed":
				this.httpGetResult(CommonFunc.RESULT_OK);
				break;
			default:
				// Not RSS or Atom
				this.httpGetResult(CommonFunc.RESULT_NOT_RSS);
				break;
		}
	},

	httpGetResult:	function httpGetResult(aResultCode)
	{
		this.abort();
		this.loading = false;

		if (aResultCode == CommonFunc.RESULT_OK)
		{

			this.currentFeed = new Feed(this.responseXML, this.uri);

			this._callListeners("loadListeners", this.currentFeed);

		}
		else
		{
			this._callListeners("errorListeners", aResultCode);
		}

		// clean up
		this.responseXML = null;
	}
};
