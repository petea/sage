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

/*
var handler = {
	startElement:   function (sTagName, oAttrs) {},
	endElement:     function (sTagName) {},
    characters:		function (s) {},
    comment:		function (s) {}
};
*/

function SimpleHtmlParser() {}

SimpleHtmlParser.prototype = {

	handler:	null,

	// regexps

	startTagRe:	/^<([^<>\s\/]+)((\s+[^=<>\s]+(\s*=\s*((\"[^"]*\")|(\'[^']*\')|[^>\s]+))?)*)\s*\/?\s*>/m,
	endTagRe:	/^<\/([^>\s]+)[^>]*>/m,
	attrRe:		/([^=\s]+)(\s*=\s*((\"([^"]*)\")|(\'([^']*)\')|[^>\s]+))?/gm,

	parse:	function (s, oHandler) {
		if (oHandler) {
			this.contentHandler = oHandler;
		}

		var i = 0;
		var res, lc, lm, rc, index;
		var treatAsChars = false;
		var oThis = this;
		while (s.length > 0) {
			// Comment
			if (s.substring(0, 4) == "<!--") {
				index = s.indexOf("-->");
				if (index != -1) {
					this.contentHandler.comment(s.substring(4, index));
					s = s.substring(index + 3);
					treatAsChars = false;
				} else {
					treatAsChars = true;
				}
			// end tag
			} else if (s.substring(0, 2) == "</") {
				if (this.endTagRe.test(s)) {
					lc = RegExp.leftContext;
					lm = RegExp.lastMatch;
					rc = RegExp.rightContext;

					lm.replace(this.endTagRe, function () {
						return oThis.parseEndTag.apply(oThis, arguments);
					});

					s = rc;
					treatAsChars = false;
				} else {
					treatAsChars = true;
				}
			// start tag
			} else if (s.charAt(0) == "<") {
				if (this.startTagRe.test(s)) {
					lc = RegExp.leftContext;
					lm = RegExp.lastMatch;
					rc = RegExp.rightContext;

					lm.replace(this.startTagRe, function () {
						return oThis.parseStartTag.apply(oThis, arguments);
					});

					s = rc;
					treatAsChars = false;
				} else {
					treatAsChars = true;
				}
			}

			if (treatAsChars) {
				index = s.indexOf("<");
				if (index == -1) {
					this.contentHandler.characters(s);
					s = "";
				} else {
					if (index == 0) {	// in case we got a < in the character stream
						index++;
					}
					this.contentHandler.characters(s.substring(0, index));
					s = s.substring(index);
				}
			}

			treatAsChars = true;
		}
	},

	parseStartTag:	function (sTag, sTagName, sRest) {
		var attrs = this.parseAttributes(sTagName, sRest);
		this.contentHandler.startElement(sTagName, attrs);
	},

	parseEndTag:	function (sTag, sTagName) {
		this.contentHandler.endElement(sTagName);
	},

	parseAttributes:	function (sTagName, s) {
		var oThis = this;
		var attrs = [];
		s.replace(this.attrRe, function () {
			var args = [sTagName];
			for (var i = 0; i < arguments.length; i++) {
				args.push(arguments[i]);
			}
			attrs.push(oThis.parseAttribute.apply(oThis, args));
		});
		return attrs;
	},

	parseAttribute: function (sTagName, sAttribute, sName) {
		var value = "";
		if (arguments[7]) {
			value = arguments[8];
		} else if (arguments[5]) {
			value = arguments[6];
		} else if (arguments[3]) {
			value = arguments[4];
		}

		var empty = !value && !arguments[3];
		return {name: sName, value: empty ? null : value};
	}
};
