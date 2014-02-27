ColorMunch-JS v0.1
==========

ColorMunch-JS is a Javascript library that makes retrieving themes, colors and comments from the Adobe Kuler API easy.

**Note: You'll need a Kuler API key to use ColorMunch-JS.**

If you don't have an API key then you're out of luck for the time being as they stopped issuing new API keys in May 2013. https://wikidocs.adobe.com/wiki/display/kulerdev/Kuler+API

![Colored by Adobe Kuler](http://cm.rprdev.com/ku_50pxWtext.png)

Getting Started
-------

This is a quick guide to getting up and running with ColorMunch-JS and the Adobe Kuler API.

Very simply:

1. Create a ColorMunch instance
2. Add event listeners
3. Call one of the load or search methods
4. Grab the results via the various getter methods

#### Create a ColorMunch instance

```javascript
// creates a new ColorMunch instance with your proxy file
var cm = new ColorMunch('absolute/path/to/proxy/file');
```

#### Listening for events

At a minimum listen for the ColorMunchEvent.COMPLETE event
You can also listen for the ColorMunchEvent.FAILED event
See [Using the events](https://github.com/BK4D/colormunch-js#using-the-events)

Events can be added either with 'on' or 'addEventListener'

```javascript
// This will fire when the result has been received and processed, or if the results are empty
cm.on(ColorMunchEvent.COMPLETE, completeEventHandler);

// This will fire when an error occurs or if the instance is busy with another request
cm.addEventListener(ColorMunchEvent.FAILED, failedEventHandler);
```

#### Loading themes

The loadThemes method loads a set of themes based on the following parameters:

- listType:String (optional) The type of list to return. Options are:
    - ColorMunch.LIST_MOST_RECENT (default)
    - ColorMunch.LIST_POPULAR
    - ColorMunch.LIST_HIGHEST_RATED
    - ColorMunch.LIST_RANDOM
- startIndex:int (optional) A 0-based index into the list that specifies the first item to display.
    - Default is 0, which displays the first item in the list.
- timeSpan:int (optional) Value in days to limit the set of themes retrieved.
    - Default is 0, which retrieves all themes without time limit.
- itemsPerPage:int (optional) The maximum number of items to display, in the range 1-100.
    - Default is 20.

Because all parameters of the loadThemes() method are optional, as a very basic option you can call it without any parameters.

```javascript
// This will fetch a list of the 20 most recent themes.
cm.loadThemes();
```

#### Retrieving theme results

When the results from the Kuler API have been retrieved, the data is stored into ColorMunchTheme and ColorMunchSwatch instances.

ColorMunchTheme objects are accessed through your ColorMunch instance, and ColorMunchSwatch objects are in turn accessed through each ColorMunchTheme object.

*Note: the retrieval of the result data should only be made after the ColorMunchEvent.COMPLETE event is fired*

Once you start playing around you'll ALL the info available via the getter methods. Here's a couple of very simple ones.

```javascript
// Grab a random theme from the result set, and place its sprite on the stage
var theme = cm.getRandomTheme();
var themeEl = theme.getElement();
themeEl.style.width = '100%';
themeEl.style.height = '100px';
document.body.appendChild(themeEl);

// we can access swatch information through a ColorMunchTheme object
console.log(theme.getTitle());
var swatch,
	i;
for (i = 0; i < theme.getSwatchCount(); i++) {
    swatch = theme.getSwatchByIndex(i);
    console.log("- " + swatch.getHexString());
}
```

Using the events
-------

Custom events are dispatched by the ColorMunch object. Additional info can be retrieved through the events' detail object.

#### Complete

A ColorMunchEvent.COMPLETE event is fired when a result set (from a loadThemes, searchThemes or loadComments method call) is received, processed and ready to be accessed, or when the results are empty.

Example:

```javascript
cm.on(ColorMunchEvent.COMPLETE, onResultReady);
cm.loadThemes();

function onResultReady(e) {
	if (e.detail && e.detail.empty) {
		console.log('Results are empty.');
	}
	else {
	    // the themes are loaded, you can now access them
	    var allThemes = cm.getThemes(),
	        i;
	    console.log(allThemes.length + " themes loaded:");
	    for (i = 0; i < allThemes.length; i++) {
	        var theme = allThemes[i];
	        console.log(theme.toString());
	    }
	}
}
```

#### Failed

A ColorMunchEvent.FAILED is fired for any of the following scenarios:
- if the loader is busy with a request (the event's detail.busy property will be true)
- if there is an error in one of the parameters for a loadThemes, searchThemes or loadComments method call (see the event's detail.message for more info)
- if there is an error loading the feed (see the event's detail.message for more info)

Example:

```javascript
cm.on(ColorMunchEvent.FAILED, onCMFailed);
cm.loadThemes();

function onCMFailed(e) {
	if (e.detail && e.detail.busy) {
		console.log('Busy.');
	}
	else {
		var msg = (e.detail && e.detail.message) ? e.detail.message : "";
	    console.log('ColorMunch Failed: ' + msg);
	}
}
```

Searching themes
-------

As well as loading the various theme lists (most recent, etc) through the loadThemes method you can perform specific searches for themes

The searchThemes method will search for themes based on the following parameters:

- filter:String The filter to narrow your search. Options are:
    - ColorMunch.FILTER_NONE (No filter. Will perform search on theme titles, tags, author names, themeIDs, authorIDs, and hexValues)
    - ColorMunch.FILTER_THEME_ID (Search on a specific themeID)
    - ColorMunch.FILTER_USER_ID (Search on a specific userID)
    - ColorMunch.FILTER_EMAIL (Search on a specific email)
    - ColorMunch.FILTER_TAG (Search on a tag word)
    - ColorMunch.FILTER_HEX (Search on a hex colour value - can be in the format "ABCDEF" or "0xABCDEF")
    - ColorMunch.FILTER_TITLE (Search on a theme title)
- query:String The search query. Use a simple string term to search on
- startIndex:int (optional) A 0-based index into the list that specifies the first item to display.
    - Default is 0, which displays the first item in the list.
- itemsPerPage:int (optional) The maximum number of items to display, in the range 1-100.
    - Default is 20.

```javascript
// Using the hex color filter, perform a search for themes that contain a black swatch
cm.searchThemes(ColorMunch.FILTER_HEX, "0x000000")
```

Loading comments
-------

You can load comments in a couple of different ways...

### Through a ColorMunch instance

When loading comments through a ColorMunch instance the loadComments method will search for comments based on the following parameters:

- filter:String The filter to search by. Options are:
    - ColorMunch.COMMENTS_BY_EMAIL (comments are retrieved for all themes created by this user)
    - ColorMunch.COMMENTS_BY_THEME_ID (comments are retrieved for the specified theme)
- query:String The value associated with the filter.
    - If the filter is ColorMunch.COMMENTS_BY_EMAIL then query would be a users' email address
    - If the filter is ColorMunch.COMMENTS_BY_THEME_ID then the query would be a themeID.
- startIndex:int (optional) A 0-based index into the list that specifies the first item to display.
    - Default is 0, which displays the first item in the list.
- itemsPerPage:int (optional) The maximum number of items to display, in the range 1-100.
    - Default is 20.

```javascript
// Get comments for the theme 'firenze'
cm.loadComments(ColorMunch.COMMENTS_BY_THEME_ID, "24198");
```

#### Through a ColorMunchTheme object

If you have already loaded a bunch of themes with your ColorMunch instance you can actually get the comments of specific theme(s) in your result by using that ColorMunchTheme objects' loadComments method.

The benefit is that the theme's comments are stored in the Theme object and accessed from there. The same events you would listen for on the ColorMunch instance will be dispatched by the ColorMunchThemeTheme object.

When loading comments through a ColorMunchThemeTheme object the loadComments method will search for comments for that particular theme based on the following parameters:

- startIndex:int (optional) A 0-based index into the list that specifies the first item to display.
    - Default is 0, which displays the first item in the list.
- itemsPerPage:int (optional) The maximum number of items to display, in the range 1-100.
    - Default is 20.

```javascript
// assuming we've loaded a themes result set with a ColorMunch instance (using either the loadThemes or searchThemes methods)
var theme = cm.getRandomTheme();
theme.on(ColorMunchEvent.RESULT_READY, onThemeCommentsReady);
theme.loadComments();
```

The difference might not be completely clear at first but hopefully you'll see the benefit of this option.

Retrieving comment results
-------

When ColorMunch has retrieved the result from the Kuler API it stores the data into ColorMunchComment objects.

Whichever way you choose to load/access the comments, the getter methods are the same.

Note: the retrieval of the result data should only be made after the ColorMunchEvent.COMPLETE event is fired

**When comments are loaded through the ColorMunch instance**

```javascript
// Get a random comments from the result
var comment = cm.getRandomComment();
```

**When comments are loaded through a ColorMunchTheme object**

```javascript
// Get a random comments from the result
var comment = theme.getRandomComment();
```

With either of the above methods, you could trace out the comment's properties like this

```javascript
// Get a random comments from the result
console.log(comment.toString());
```

Basic Example
-------
http://jsfiddle.net/6CxVL/3/