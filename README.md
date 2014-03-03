ColorMunch-JS v0.1
==========

![ColorMunch](http://farm4.static.flickr.com/3532/3797501005_f21396ea73.jpg)

![Colored by Adobe Kuler](http://cm.rprdev.com/ku_50pxWtext.png)

ColorMunch-JS is a Javascript library that makes retrieving themes, colors and comments from the Adobe Kuler API easy.

Originally written as an [ActionScript library](https://code.google.com/p/colormunch/) back in the day, I've updated to JS for a personal project.

**Note: You'll need a Kuler API key to use ColorMunch-JS.**

If you don't have an API key then you're out of luck for the time being as they stopped issuing new API keys in May 2013. https://wikidocs.adobe.com/wiki/display/kulerdev/Kuler+API

Reverse Proxy
-------
Due to same-origin policy you can't use ColorMunch-JS to load directly from the Kuler API, so I've created a simple reverse proxy (PHP) to be used on the server. Put your API key in there and just pass in the proxy path to the ColorMunch constructor.

See the ColorMunch-proxy.php file for more info.

Getting Started
-------

The uncompressed source is basically self-documented so take a look through and just have a play.

Below is a quick guide to getting up and running with ColorMunch-JS and the Adobe Kuler API.

Very simply:

1. Create a ColorMunch instance
2. Add event listeners
3. Call one of the load or search methods
4. Grab the results via the various getter methods

#### Create a ColorMunch instance

```javascript
// creates a new ColorMunch instance with your proxy file
var cm = new ColorMunch('path/to/proxy/file');
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

- listType (optional) The type of list to return. Options are:
    - ColorMunch.LIST_MOST_RECENT (default)
    - ColorMunch.LIST_POPULAR
    - ColorMunch.LIST_HIGHEST_RATED
    - ColorMunch.LIST_RANDOM
- startIndex (optional) A 0-based index into the list that specifies the first item to display.
    - Default is 0, which displays the first item in the list.
- timeSpan (optional) Value in days to limit the set of themes retrieved.
    - Default is 0, which retrieves all themes without time limit.
- itemsPerPage (optional) The maximum number of items to display, in the range 1-100.
    - Default is 20.

Because all parameters of the loadThemes() method are optional, as a very basic option you can call it without any parameters.

```javascript
// This will fetch a list of the 20 most recent themes.
cm.loadThemes();
```

#### Retrieving theme results

When the results from the Kuler API have been retrieved, the data is stored into ColorMunchTheme and ColorMunchSwatch instances.

ColorMunchTheme instances are accessed through your ColorMunch instance, and ColorMunchSwatch instances are in turn accessed through each ColorMunchTheme instance.

*Note: the retrieval of the result data should only be made after the ColorMunchEvent.COMPLETE event is fired*

Once you start playing around you'll discover **all** the info available via the getter methods. Here's a couple of very simple ones:

```javascript
// Grab a random theme from the result set
var theme = cm.getRandomTheme();
console.log(theme.toString());
// we can access swatch information through a ColorMunchTheme instance
var swatches = theme.getSwatches(),
	swatch,
	i;
for (i = 0; i < swatches.length; i++) {
    swatch = swatches[i];
    console.log(swatch.toString());
}
```

#### Theme / swatch elements

ColorMunchTheme and ColorMunchSwatch instances have a getElement method, which returns a DOM element you can use.

When you call getElement on a ColorMunchTheme it will call getElement on all its swatches and build a theme element

The theme element markup looks like the following:

```html
<div id="cm-theme_3582331" class="cm-theme">
	<span class="cm-theme-label">Standing O</span>
	<div class="cm-swatch cm-swatch--1" style="background-color: rgb(66, 222, 181);">
		<span class="cm-swatch-label">42DEB5</span>
	</div>
	<div class="cm-swatch cm-swatch--2" style="background-color: rgb(232, 97, 85);">
		<span class="cm-swatch-label">E86155</span>
	</div>
	<div class="cm-swatch cm-swatch--dark-true cm-swatch--3" style="background-color: rgb(106, 191, 187);">
		<span class="cm-swatch-label">6ABFBB</span>
	</div>
	<div class="cm-swatch cm-swatch--4" style="background-color: rgb(215, 224, 242);">
		<span class="cm-swatch-label">D7E0F2</span>
	</div>
	<div class="cm-swatch cm-swatch--dark-true cm-swatch--5" style="background-color: rgb(50, 41, 71);">
		<span class="cm-swatch-label">322947</span>
	</div>
</div>
```

For example:

```javascript
// Grab a random theme from the result set, and place its element on the stage
var theme = cm.getRandomTheme();
var themeEl = theme.getElement();
themeEl.style.width = '100%';
themeEl.style.height = '100px';
document.body.appendChild(themeEl);
```


If you prefer to just deal with HTML strings you can use the ColorMunchTheme and ColorMunchSwatch instance's getElementString method.

By default the returned value is essentially a string representation of the getElement result:

```javascript
// default theme template string
'<div id="cm-theme_{{id}}" class="cm-theme"><span class="cm-theme-label">{{title}}</span>{{swatches}}</div>'
// default swatch template string
'<div class="cm-swatch cm-swatch--{{index}} cm-swatch--dark-{{isDark}}" style="background-color:{{hexColor}};"><span class="cm-swatch-label">{{hexColor}}</span></div>'
```

The great part about the templates is that you can actually customise them. It's just very basic mustache-like tags and you can use most of the properties found in the getData result that return string values.

The exception is with the theme template where you can use the 'swatches' property which will include the result of getElementString from each of the swatches in the theme.

**For Themes:**

- id
- title
- description
- image (src url)
- link (url)
- rating
- downloadCount
- author
- authorId
- swatches

**For Swatches:**

- hexColor
- colorMode
- index
- isDark (boolean as string)


If you're wanting to do something more complex then just write your own methods for outputting elements or markup using any of the data available in themes and swatches.

To override the templates simply set ColorMunch.THEME_TEMPLATE and/or ColorMunch.SWATCH_TEMPLATE to your own template strings.

```javascript
// Customise the templates to output the theme as an unordered list
ColorMunch.THEME_TEMPLATE = '<h3>{{title}}</h3><ul>{{swatches}}</ul>';
ColorMunch.SWATCH_TEMPLATE = '<li>{{hexColor}}</li>';
```

The return string is only created the first time you call getElementString on a ColorMunchTheme and/or ColorMunchSwatch instance and then stored in a local variable.

If you change the template after having already called the getElementString method then you will need to tell it to refresh the next time you call it by passing in the boolean value as a parameter, else you will continue to get back the old string template/markup

```javascript
// Customise the templates to output the theme as an unordered list
ColorMunch.THEME_TEMPLATE = '<h3>{{title}}</h3><ul>{{swatches}}</ul>';
ColorMunch.SWATCH_TEMPLATE = '<li>{{hexColor}}</li>';

var theme = cm.getRandomTheme();
console.log(theme.getElementString());
// The above will output something like:
// '<h3>Color Cube</h3><ul><li>12263C</li><li>EBEDE7</li><li>E3C720</li><li>2B3952</li><li>45130C</li></ul>'

// Now change the templates
ColorMunch.THEME_TEMPLATE = '<h3 class="theme-title">{{title}}</h3><ul class="theme-swatches">{{swatches}}</ul>';
ColorMunch.SWATCH_TEMPLATE = '<li style="color:#{{hexColor}};">{{hexColor}}</li>';
console.log(theme.getElementString());
// The above will still output the old string because we haven't told it to refresh

console.log(theme.getElementString(true)); // the true value tells it to refresh, and this boolean is passed into the getElementString calls on that swatches
// The output will now be correctly updated to something like:
// '<h3 class="theme-title">Color Cube</h3><ul><li style="color:#12263C;">12263C</li><li style="color:#EBEDE7;">EBEDE7</li><li style="color:#E3C720;">E3C720</li><li style="color:#2B3952;">2B3952</li><li style="color:#45130C;">45130C</li></ul>'
```

The default templates can always be accessed via static getter methods.

```javascript
// If you have overridden the templates and want to reset them to their defaults:
ColorMunch.THEME_TEMPLATE = ColorMunch.getDefaultThemeTemplate();
ColorMunch.SWATCH_TEMPLATE = ColorMunch.getDefaultSwatchTemplate();
```

The ColorMunch instance also has a couple of handy methods for getting all the theme elements and element strings in a single array
```javascript
var allElements = cm.getThemeElements();
var allElementStrings = cm.getThemeElementStrings();

// this is a quick way to 'refresh' all the themes after changing the template
var allRefreshedElementStrings = cm.getThemeElementStrings(true);
```


Using the events
-------

Custom events are dispatched by the ColorMunch instance. Additional info can be retrieved through the events' detail object.

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

- query The search query. Use a simple string term to search on
- filter (optional) The filter to narrow your search. Options are:
    - ColorMunch.FILTER_NONE (default) No filter. Will perform search on theme titles, tags, author names, themeIDs, authorIDs, and hexValues
    - ColorMunch.FILTER_THEME_ID (Search on a specific themeID)
    - ColorMunch.FILTER_USER_ID (Search on a specific userID)
    - ColorMunch.FILTER_EMAIL (Search on a specific email)
    - ColorMunch.FILTER_TAG (Search on a tag word)
    - ColorMunch.FILTER_HEX (Search on a hex colour value - can be in the format "ABCDEF" or "0xABCDEF")
    - ColorMunch.FILTER_TITLE (Search on a theme title)
- startIndex (optional) A 0-based index into the list that specifies the first item to display.
    - Default is 0, which displays the first item in the list.
- itemsPerPage (optional) The maximum number of items to display, in the range 1-100.
    - Default is 20.

```javascript
// Using the hex color filter, perform a search for themes that contain a black swatch
cm.searchThemes("0x000000", ColorMunch.FILTER_HEX);

// Or get a tag from a theme and search for other themes containing that tag
var theme = cm.getRandomTheme();
var tags = theme.getTags();
if (tags.length > 0) {
	cm.searchThemes(tags[0], ColorMunch.FILTER_TAG);
}
```

Loading comments
-------

You can load comments in a couple of different ways...

#### Through a ColorMunch instance

When loading comments through a ColorMunch instance the loadComments method will search for comments based on the following parameters:

- filter (required) The filter to search by. Options are:
    - ColorMunch.COMMENTS_BY_EMAIL (comments are retrieved for all themes created by this user)
    - ColorMunch.COMMENTS_BY_THEME_ID (comments are retrieved for the specified theme)
- query (required) The value associated with the filter.
    - If the filter is ColorMunch.COMMENTS_BY_EMAIL then query would be a users' email address
    - If the filter is ColorMunch.COMMENTS_BY_THEME_ID then the query would be a themeID.
- startIndex (optional) A 0-based index into the list that specifies the first item to display.
    - Default is 0, which displays the first item in the list.
- itemsPerPage (optional) The maximum number of items to display, in the range 1-100.
    - Default is 20.

```javascript
// Get comments for the theme 'firenze'
cm.loadComments(ColorMunch.COMMENTS_BY_THEME_ID, "24198");
```

#### Through a ColorMunchTheme instance

If you have already loaded a bunch of themes with your ColorMunch instance you can actually get the comments of specific theme(s) in your result by using that ColorMunchTheme instances' loadComments method.

The benefit is that the theme's comments are stored in the ColorMunchTheme instance and accessed from there. The same events you would listen for on the ColorMunch instance will be dispatched by the ColorMunchThemeTheme instance.

When loading comments through a ColorMunchThemeTheme instance the loadComments method will search for comments for that particular theme based on the following parameters:

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

### Retrieving the comment results

When ColorMunch has retrieved the result from the Kuler API it stores the data into ColorMunchComment instances.

Whichever way you choose to load/access the comments, the getter methods are the same.

Note: the retrieval of the result data should only be made after the ColorMunchEvent.COMPLETE event is fired

**When comments are loaded through the ColorMunch instance**

```javascript
// Get a random comment from the result
var comment = cm.getRandomComment();
```

**When comments are loaded through a ColorMunchTheme instance**

```javascript
// Get a random comment from the result
var comment = theme.getRandomComment();
```

With either of the above methods, you can log comment like this

```javascript
console.log(comment.toString());
```

Basic Example
-------
http://jsfiddle.net/6ztb9/