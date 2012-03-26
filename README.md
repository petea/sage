Sage
====

Sage is a lightweight [RSS][rss] and [Atom][atom] feed reader extension for [Mozilla Firefox][firefox]. It's got a lot of what you need and not much of what you don't.


How to Build Sage
-----------------

### Dependencies

* [Python][python]
* [Gecko SDK][gecko]
* [Ant][ant]

### Building

    $ git clone git@github.com:petea/sage.git
    $ cd sage
    $ curl [your Gecko SDK url] | tar -x
    $ ant

If all goes well, you'll find the [XPI][xpi] file under the sage/build folder.


[rss]: http://en.wikipedia.org/wiki/RSS
[atom]: http://en.wikipedia.org/wiki/Atom_(standard)
[firefox]: http://www.mozilla.com/firefox/
[python]: http://www.python.org
[gecko]: https://developer.mozilla.org/en/Gecko_SDK
[ant]: http://ant.apache.org
[xpi]: https://developer.mozilla.org/en/XPI