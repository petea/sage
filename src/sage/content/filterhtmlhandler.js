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

/**
 * This class creates a simple handler for SimpleHtmlParser that filters out
 * potentially unsafe HTML code
 */
function FilterHtmlHandler()
{
	this._sb = [];
}

FilterHtmlHandler.prototype = {

	_inBlocked:	null,

	clear:	function ()
	{
		this._sb = [];
	},

	toString:	function ()
	{
		return this._sb.join("");
	},

// handler interface

	startElement:   function (sTagName, attrs)
	{
		if (this._inBlocked)
			return;

		var ls = sTagName.toLowerCase();
		switch (ls)
		{
			case "embed":
			case "link":
			case "meta":
			case "applet":
			case "object":
			case "frame":
			case "frameset":
			case "iframe":
			case "font":
			case "center":
				return;

			case "script":
			case "style":
				this._inBlocked = ls;
				break;

			default:
				this._sb.push("<" + sTagName);
		}

		if (!this._inBlocked)
		{
			for (var i = 0; i < attrs.length; i++)
			{
				this.attribute(sTagName, attrs[i].name, attrs[i].value);
			}
			this._sb.push(">");
		}
	},

	endElement:     function (s)
	{
		var ls = s.toLowerCase();
		switch (ls)
		{
			case "embed":
			case "applet":
			case "object":
			case "frame":
			case "frameset":
			case "iframe":
			case "font":
			case "center":
				return;
		}
		if (this._inBlocked)
		{
			if (this._inBlocked == ls)
				this._inBlocked = null;
			return;
		}
		this._sb.push("</" + s + ">");
	},

	attribute:  function (sTagName, sName, sValue)
	{
		if (this._inBlocked)
			return;

		var nl = sName.toLowerCase();
		var vl = String(sValue).toLowerCase();	// might be null

		switch (nl)
		{
			case "align":
			case "style":
				return;
		}

		if (nl == "type" && vl == "text/css" ||
			nl == "rel" && vl == "stylesheet")
		{
			this._sb.push(" " + sName + "=\"BLOCKED\"");
		}
		else if (nl.substr(0,2) == "on")
		{
			//noop
		}
		else if ((nl == "href" || nl == "src" || nl == "data" || nl == "codebase") &&
				 /^javascript\:/i.test(vl))
		{
			//noop
		}
		else if (nl == "style")
		{
			sValue = sValue.replace(/\-moz\-binding/gi, "BLOCKED")
					.replace(/binding/gi, "BLOCKED")
					.replace(/behavior/gi, "BLOCKED")
					.replace(/\:\s*expression\s*\(/gi, ":BLOCKED(");
			this._sb.push(" " + sName + "=\"" + sValue + "\"");
		}
		else
		{
			if (sValue == null)
				this._sb.push(" " + sName);
			else
				this._sb.push(" " + sName + "=\"" + sValue + "\"");
		}
	},

	characters:	function (s)
	{
		if (!this._inBlocked)
			this._sb.push(s);
	},

	comment:	function (s)
	{
		//this._sb.push(s);
	}
};
