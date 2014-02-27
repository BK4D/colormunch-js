/**
 * ColorMunch 0.1: Javascript library for the Adobe Kuler API (https://github.com/BK4D/colormunch-js)
 *
 * ColorMunch is (c) 2014 Ben Kanizay
 * This software is released under the MIT License (http://www.opensource.org/licenses/mit-license.php)
 *
 */

/**
 * Create a new ColorMunch instance
 *
 * @param proxyUrl Path to the reverse proxy file on your server
 * @constructor
 *
 */
function ColorMunch(proxyUrl) {

    "use strict";
    ColorMunchEvent.apply(this);

    if (proxyUrl === null || proxyUrl === undefined || typeof proxyUrl !== 'string' || proxyUrl === '') {
        throw new Error('ColorMunch(): a valid proxyUrl is required.');
    }


    // ************************************************************************
    // PRIVATE VARIABLES
    // ***********************************************************************

    var self = this,
        // The API url for retrieving themes
        LIST_URL = "https://kuler-api.adobe.com/feeds/rss/get.cfm",

        // The API url for searching
        SEARCH_URL = "https://kuler-api.adobe.com/rss/search.cfm",

        // The API url for retrieving comments
        COMMENTS_URL = "https://kuler-api.adobe.com/rss/comments.cfm",

        // RegExp pattern for validating email address
        REGEXP_EMAIL = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,

        // RegExp pattern for matching a hex color in the format 0xFFFFFF or FFFFFF
        REGEXP_HEX = /\b0x(?:[0-9A-Fa-f]{6})\b/g,

        // RegExp pattern for matching themeId and userId
        REGEXP_THEME_USER_ID = /^[-+]?\d*$/,

        // RegExp pattern for matching all html tags
        REGEXP_HTML_TAGS = /<.*?>/g,

        // Array to store ColorMunchTheme objects from the themes result
        _themes = [],

        // Array to store ColorMunchComment objects from the comments result
        _comments = [],

        // The Boolean value for whether an API call is currently in progress already
        _busy = false,

        // The loader for communicating with the proxy
        _feedLoader = null,

        // Url to the reverse proxy file on your server
        _proxyUrl = proxyUrl;


    // ************************************************************************
    // PUBLIC METHODS - Privileged access to the private vars
    // ************************************************************************

    /**
     * Starts the process of loading a Kuler themes list
     * The following events may dispatched during the process:
     * ColorMunchEvent.FAILED:
     *      - If event.detail.busy === true then the loader is already processing a request
     *      - Else event.detail.message will contain further info on any errors
     * ColorMunchEvent.COMPLETE:
     *      - The result has been parsed and the can now to be read (via the public getters).
     *      - If event.detail.empty === true then there were no results
     *
     * @param listType (optional) The type of list to return. Options are:
     *              - ColorMunch.LIST_MOST_RECENT (default)
     *              - ColorMunch.LIST_POPULAR
     *              - ColorMunch.LIST_HIGHEST_RATED
     *              - ColorMunch.LIST_RANDOM
     * @param startIndex (optional) A 0-based index into the list that specifies the first item to display.
     *              - Default is 0, which displays the first item in the list.
     * @param timeSpan (optional) Value in days to limit the set of themes retrieved.
     *              - Default is 0, which retrieves all themes without time limit.
     * @param itemsPerPage (optional) The maximum number of items to display, in the range 1-100.
     *              - Default is 20.
     *
     */
    self.loadThemes = function (listType, startIndex, timeSpan, itemsPerPage) {
        // set defaults
        listType = (listType !== undefined && listType !== null) ? listType : ColorMunch.LIST_MOST_RECENT;
        startIndex = (startIndex !== undefined && startIndex !== null) ? startIndex : ColorMunch.START_INDEX;
        timeSpan = (timeSpan !== undefined && timeSpan !== null) ? timeSpan : ColorMunch.TIME_SPAN;
        itemsPerPage = (itemsPerPage !== undefined && itemsPerPage !== null) ? itemsPerPage : ColorMunch.ITEMS_PER_PAGE;

        var validation = __isValidListType(listType);
        if (validation === true) {
            var url = LIST_URL + "?listType=" + listType + "&startIndex=" + startIndex + "&timeSpan=" + timeSpan + "&itemsPerPage=" + itemsPerPage;
            __getThemesFeed(url);
        } else {
            self.emit(ColorMunchEvent.FAILED, { detail: { message: "loadThemes(): " + validation } });
        }
    };

    /**
     * Starts the process of searching Kuler themes
     * The following events may dispatched during the process
     * ColorMunchEvent.FAILED:
     *      - If event.detail.busy === true then the loader is already processing a request
     *      - Else event.detail.message will contain further info on any errors
     * ColorMunchEvent.COMPLETE:
     *      - The result has been parsed and the can now to be read (via the public getters).
     *      - If event.detail.empty === true then there were no results
     *
     * @param query The search query. Use a simple string term to search on.
     * @param filter (optional) The filter to narrow your search. Options are:
     *              - ColorMunch.FILTER_NONE (default) (No filter. Will perform search on theme titles, tags, author names, themeIDs, authorIDs, and hexValues)
     *              - ColorMunch.FILTER_THEME_ID (Search on a specific themeID)
     *              - ColorMunch.FILTER_USER_ID (Search on a specific userID)
     *              - ColorMunch.FILTER_EMAIL (Search on a specific email)
     *              - ColorMunch.FILTER_TAG (Search on a tag term)
     *              - ColorMunch.FILTER_HEX (Search on a hex colour value - can be in the format "ABCDEF" or "0xABCDEF")
     *              - ColorMunch.FILTER_TITLE (Search on a theme title)
     * @param startIndex (optional) A 0-based index into the list that specifies the first item to display.
     *              - Default is 0, which displays the first item in the list.
     * @param itemsPerPage (optional) The maximum number of items to display, in the range 1-100.
     *              - Default is 20.
     *
     */
    self.searchThemes = function (query, filter, startIndex, itemsPerPage) {
        // check required args
        if (query === undefined || query === null || typeof query !== 'string' || query === '') {
            throw new Error("searchThemes(): query argument is required and cannot be an empty string.");
        }

        // set defaults
        filter = (filter !== undefined && filter !== null) ? filter : ColorMunch.FILTER_NONE;
        startIndex = (startIndex !== undefined && startIndex !== null) ? startIndex : ColorMunch.START_INDEX;
        itemsPerPage = (itemsPerPage !== undefined && itemsPerPage !== null) ? itemsPerPage : ColorMunch.ITEMS_PER_PAGE;

        var validation = __isValidThemeSearch(filter, query);
        if (validation === true) {
            var searchQuery = (filter === ColorMunch.FILTER_NONE) ? query : filter + ":" + query;
            var url = SEARCH_URL + "?searchQuery=" + searchQuery + "&startIndex=" + startIndex + "&itemsPerPage=" + itemsPerPage;
            __getThemesFeed(url);
        } else {
            self.emit(ColorMunchEvent.FAILED, { detail: { message: "searchThemes(): " + validation } });
        }
    };

    /**
     * Starts the process of loading Kuler theme comments
     * The following events may dispatched during the process
     * ColorMunchEvent.FAILED:
     *      - If event.detail.busy === true then the loader is already processing a request
     *      - Else event.detail.message will contain further info on any errors
     * ColorMunchEvent.COMPLETE:
     *      - The result has been parsed and the can now to be read (via the public getters).
     *      - If event.detail.empty === true then there were no results
     *
     * @param filter The filter to search by. Options are:
     *              - ColorMunch.COMMENTS_BY_EMAIL (comments are retrieved for themes created by this user)
     *              - ColorMunch.COMMENTS_BY_THEME_ID (comments are retrieved for the specified theme)
     * @param query The value associated with the filter.
     *              - If the filter is ColorMunch.COMMENTS_BY_EMAIL then query would be a users' email address
     *              - If the filter is ColorMunch.COMMENTS_BY_THEME_ID then the query would be a themeID.
     * @param startIndex (optional) A 0-based index into the list that specifies the first item to display.
     *              - Default is 0, which displays the first item in the list.
     * @param itemsPerPage (optional) The maximum number of items to display, in the range 1-100.
     *              - Default is 20.
     *
     */
    self.loadComments = function (filter, query, startIndex, itemsPerPage) {
        // check required args
        if (filter === undefined || filter === null) {
            throw new Error("loadComments(): filter argument is required");
        }
        if (query === undefined || query === null) {
            throw new Error("loadComments(): query argument is required");
        }

        // set defaults
        startIndex = (startIndex !== undefined && startIndex !== null) ? startIndex : ColorMunch.START_INDEX;
        itemsPerPage = (itemsPerPage !== undefined && itemsPerPage !== null) ? itemsPerPage : ColorMunch.ITEMS_PER_PAGE;

        var validation = __isValidCommentSearch(filter, query);
        if (validation === true) {
            var url = COMMENTS_URL + "?" + filter + "=" + query + "&startIndex=" + startIndex + "&itemsPerPage=" + itemsPerPage;
            __getCommentsFeed(url);
        } else {
            self.emit(ColorMunchEvent.FAILED, { detail: { message: "loadComments(): " + validation } });
        }
    };



    // ************************************************************************
    // PRIVATE FUNCTIONS
    // ***********************************************************************

    /**
     * Loads a themes feed as called by either loadThemes or searchThemes
     *
     * @param url The full feed/query url
     *
     */
    function __getThemesFeed(url) {
        // check required args
        if (url === undefined || url === null) {
            throw new Error("getThemesFeed(): url argument is required");
        }

        if (_busy) {
            self.emit(ColorMunchEvent.FAILED, { detail: { message: "Busy", busy: true } });
        } else {
            _busy = true;
            var safeUrl = url.replace(REGEXP_HTML_TAGS, "");
            if (_feedLoader === null) {
                _feedLoader = new ColorMunchFeedLoader(_proxyUrl);
            }
            _feedLoader.on(ColorMunchEvent.FAILED, __onThemesFeedLoadError);
            _feedLoader.on(ColorMunchEvent.COMPLETE, __onThemesFeedLoadComplete);
            _feedLoader.load(safeUrl);
        }
    }

    /**
     * Handler for the ColorMunchEvent.COMPLETE event on the themes feed loader
     *
     */
    function __onThemesFeedLoadComplete(e) {
        _feedLoader.un(ColorMunchEvent.FAILED, __onThemesFeedLoadError);
        _feedLoader.un(ColorMunchEvent.COMPLETE, __onThemesFeedLoadComplete);
        if (e.detail && e.detail.busy) {
            _busy = false;
            self.emit(ColorMunchEvent.FAILED, { detail: e.detail });
        } else if (e.detail.data && e.detail.data.items) {
            // success
            __parseThemes(e.detail.data.items);
        } else {
            _busy = false;
            var detail = (e.detail && e.detail.message) ? e.detail : { message: "getThemesFeed(): unknown error" };
            self.emit(ColorMunchEvent.FAILED, { detail: detail });
        }
    }

    /**
     * Handler for the ColorMunchEvent.FAILED event on the themes feed loader
     *
     */
    function __onThemesFeedLoadError(e) {
        _busy = false;
        _feedLoader.un(ColorMunchEvent.FAILED, __onThemesFeedLoadError);
        _feedLoader.un(ColorMunchEvent.COMPLETE, __onThemesFeedLoadComplete);
        var detail = (e.detail && e.detail.message) ? e.detail : { message: "getThemesFeed(): load error" };
        self.emit(ColorMunchEvent.FAILED, { detail: detail });
    }

    /**
     * Loads a comments feed as called by loadComments
     *
     * @param url The full feed/query url
     *
     */
    function __getCommentsFeed(url) {
        // check required args
        if (url === undefined || url === null) {
            throw new Error("__getCommentsFeed(): url argument is required");
        }

        if (_busy) {
            self.emit(ColorMunchEvent.FAILED, { detail: { message: "Busy", busy: true } });
        } else {
            _busy = true;
            var safeUrl = url.replace(REGEXP_HTML_TAGS, "");
            if (_feedLoader === null) {
                _feedLoader = new ColorMunchFeedLoader(_proxyUrl);
            }
            _feedLoader.on(ColorMunchEvent.FAILED, __onCommentsFeedLoadError);
            _feedLoader.on(ColorMunchEvent.COMPLETE, __onCommentsFeedLoadComplete);
            _feedLoader.load(safeUrl);
        }
    }

    /**
     * Handler for the ColorMunchEvent.COMPLETE event on the comments feed loader
     *
     */
    function __onCommentsFeedLoadComplete(e) {
        _feedLoader.un(ColorMunchEvent.FAILED, __onCommentsFeedLoadError);
        _feedLoader.un(ColorMunchEvent.COMPLETE, __onCommentsFeedLoadComplete);
        if (e.detail && e.detail.busy) {
            _busy = false;
            self.emit(ColorMunchEvent.FAILED, { detail: e.detail });
        } else if (e.detail.data && e.detail.data.items) {
            // success
            __parseComments(e.detail.data.items);
        } else {
            _busy = false;
            var detail = (e.detail && e.detail.message) ? e.detail : { message: "getCommentsFeed(): unknown error" };
            self.emit(ColorMunchEvent.FAILED, { detail: detail });
        }
    }

    /**
     * Handler for the ColorMunchEvent.FAILED event on the comments feed loader
     *
     */
    function __onCommentsFeedLoadError(e) {
        _busy = false;
        _feedLoader.un(ColorMunchEvent.FAILED, __onCommentsFeedLoadError);
        _feedLoader.un(ColorMunchEvent.COMPLETE, __onCommentsFeedLoadComplete);
        var detail = (e.detail && e.detail.message) ? e.detail : { message: "getCommentsFeed(): load error" };
        self.emit(ColorMunchEvent.FAILED, { detail: detail });
    }

    /**
     *
     * Parses the array of themes from the feed result, creating a new ColorMunchTheme object for each and pushing those into the _themes array
     * When the data has been parsed a ColorMunchEvent.COMPLETE event is dispatched.
     *      - If event.detail.empty === true then there were no results
     *
     * @param themesData The array of Kuler themes to parse
     *
     */
    function __parseThemes(themesData) {
        var themeCount = themesData.length;
        _themes = [];
        if (themeCount > 0) {
            for (var i = 0; i < themeCount; i++) {
                var theme = themesData[i];
                if (theme.themeSwatches.swatch) {
                    _themes.push(new ColorMunchTheme(
                        theme.themeID,
                        theme.themeTitle,
                        theme.description,
                        theme.themeImage,
                        theme.link,
                        theme.themeCreatedAt,
                        theme.themeEditedAt,
                        theme.themeTags,
                        theme.themeRating,
                        theme.themeDownloadCount,
                        theme.themeAuthor.authorID,
                        theme.themeAuthor.authorLabel,
                        theme.themeSwatches.swatch,
                        _proxyUrl
                    ));
                }
            }
            _busy = false;
            self.emit(ColorMunchEvent.COMPLETE, { detail: { message: "Themes loaded and ready" } });
        } else {
            _busy = false;
            self.emit(ColorMunchEvent.COMPLETE, { detail: { message: "0 themes found", empty: true } });
        }
    }

    /**
     *
     * Parses the array of comments from the feed result, creating a new Comment object for each and pushing those into the _comments array
     * When the data has been parsed a ColorMunchEvent.COMPLETE event is dispatched.
     *      - If event.detail.empty === true then there were no results
     *
     * @param commentsData The array of Kuler theme comments to parse
     *
     */
    function __parseComments(commentsData) {
        var commentCount = commentsData.length;
        _comments = [];
        if (commentCount > 0) {
            for (var i = 0; i < commentCount; i++) {
                var comment = commentsData[i];
                 _comments.push(new ColorMunchComment(
                     comment.comment,
                     comment.author,
                     comment.postedAt
                 ));
            }
            _busy = false;
            self.emit(ColorMunchEvent.COMPLETE, { detail: { message: "Comments loaded and ready" } });
        } else {
            _busy = false;
            self.emit(ColorMunchEvent.COMPLETE, { detail: { message: "0 comments found", empty: true } });
        }
    }

    /**
     *
     * An internal helper method to check that a valid list type is being used
     *
     * @return true (boolean) if the list type is valid, else the error message string will be returned
     *
     * @see loadThemes
     *
     */
    function __isValidListType(listType) {
        var valid = false;
        var error = "Invalid list type";
        switch(listType) {
            case ColorMunch.LIST_HIGHEST_RATED:
            case ColorMunch.LIST_MOST_RECENT:
            case ColorMunch.LIST_POPULAR:
            case ColorMunch.LIST_RANDOM:
                valid = true;
                break;
        }
        return (!valid) ? error : true;
    }

    /**
     *
     * An internal helper method to check that a valid theme search filter/query pair is being used
     *
     * @return true (boolean) if the filter is valid, else the error message string will be returned
     *
     * @see searchThemes
     *
     */
    function __isValidThemeSearch(filter, query) {
        var valid = false,
            error = "";
        switch(filter) {
            case ColorMunch.FILTER_THEME_ID :
                valid = (REGEXP_THEME_USER_ID.test(query));
                error = "Invalid themeID";
                break;
            case ColorMunch.FILTER_USER_ID :
                valid = (REGEXP_THEME_USER_ID.test(query));
                error = "Invalid userID";
                break;
            case ColorMunch.FILTER_EMAIL :
                valid = (REGEXP_EMAIL.test(query));
                error = "Invalid email address";
                break;
            case ColorMunch.FILTER_HEX :
                valid = (REGEXP_HEX.test(query));
                error = "Invalid hex value. Must be in the format 'ABCDEF' or '0xABCDEF'";
                break;
            case ColorMunch.FILTER_TAG :
            case ColorMunch.FILTER_NONE :
            case ColorMunch.FILTER_TITLE :
                valid = true;
                break;
            default :
                valid = false;
                error = "Invalid search filter";
                break;
        }

        return (!valid) ? error : true;
    }

    /**
     *
     * An internal helper method to check that a valid comment search filter/query pair is being used
     *
     * @return true (boolean) if the filter is valid, else the error message string will be returned
     *
     * @see loadComments
     *
     */
    function __isValidCommentSearch(filter, query) {
        var valid = false,
            error = "";
        switch(filter) {
            case ColorMunch.COMMENTS_BY_EMAIL :
                valid = (REGEXP_EMAIL.test(query));
                error = "Invalid email address";
                break;
            case ColorMunch.COMMENTS_BY_THEME_ID :
                valid = (REGEXP_THEME_USER_ID.test(query));
                error = "Invalid themeID. Must contain at least 6 digits";
                break;
            default :
                valid = false;
                error = "Invalid comment search filter";
                break;
        }
        return (!valid) ? error : true;
    }


    // ************************************************************************
    // PUBLIC GETTERS
    // ************************************************************************

    /**
     * Get the total number of themes in the feed result
     *
     * @return The total number of themes
     *
     */
    self.getThemeCount = function() {
        return _themes.length;
    };

    /**
     * Get all themes from the feed result
     *
     * @return An array of themes. Each array item is of type Theme
     *
     */
    self.getThemes = function() {
        return _themes;
    };

    /**
     * Get a specific Theme from the feed result
     *
     * @param index The array index of the theme
     *
     * @return The requested theme
     *
     */
    self.getThemeByIndex = function(index) {
        return (index >= 0 && index < _comments.length) ? _themes[index] : null;
    };

    /**
     * Get a random theme from the feed result
     *
     * @return A random theme
     *
     */
    self.getRandomTheme = function() {
        if (_themes.length > 0) {
            var random = Math.floor(Math.random() * (_themes.length));
            return _themes[random];
        } else {
            return null;
        }
    };


    /**
     * Get the total number of comments in the feed result
     *
     * @return The total number of comments
     *
     */
    self.getCommentCount = function() {
        return _comments.length;
    };

    /**
     * Get all comments from the feed result
     *
     * @return An array of comments. Each array item is a ColorMunchComment instance
     *
     -	 */
    self.getComments = function() {
        return _comments;
    };

    /**
     * Get a specific Comment from the feed result
     *
     * @param index The array index of the comment
     *
     * @return The requested comment
     *
     */
    self.getCommentByIndex = function(index) {
        return (index >= 0 && index < _comments.length) ? _comments[index] : null;
    };

    /**
     * Get a random comment from the feed result
     *
     * @return A random comment
     *
     */
    self.getRandomComment = function() {
        if (_comments.length > 0) {
            var random = Math.floor(Math.random() * (_comments.length));
            return _comments[random];
        } else {
            return null;
        }
    };


    /**
     * Check if the loader is busy
     *
     * @return boolean value for whether is it busy or not
     *
     */
    self.getBusy = function() {
        return _busy;
    };


    /**
     * Get the feed loader object
     *
     * @return ColorMunchFeedLoader
     *
     */
    self.getLoader = function() {
        return _feedLoader;
    };

}


/**
 * Get main properties in a single data object
 *
 * @return Object
 *
 */
ColorMunch.prototype.getData = function() {
    return {
        themes: this.getThemes(),
        comments: this.getComments()
    };
};


// ************************************************************************
// STATIC PROPERTIES
// ***********************************************************************

// List type for retrieving the highest rated themes
ColorMunch.LIST_HIGHEST_RATED = "rating";

// List type for retrieving the mos recent themes
ColorMunch.LIST_MOST_RECENT = "recent";

// List type for retrieving random themes
ColorMunch.LIST_RANDOM = "random";

// List type for retrieving the most popular themes
ColorMunch.LIST_POPULAR = "popular";


// Clears the search filter
ColorMunch.FILTER_NONE = "";

// themeID search filter
ColorMunch.FILTER_THEME_ID = "themeID";

// userID search filter
ColorMunch.FILTER_USER_ID = "userID";

// email search filter
ColorMunch.FILTER_EMAIL = "email";

// tag search filter
ColorMunch.FILTER_TAG = "tag";

// hex search filter
ColorMunch.FILTER_HEX = "hex";

// Theme title search filter
ColorMunch.FILTER_TITLE = "title";


// search type for retrieving comments by themeID
ColorMunch.COMMENTS_BY_THEME_ID = "themeID";

// search type for retrieving comments by author email
ColorMunch.COMMENTS_BY_EMAIL = "email";


// default itemsPerPage value
ColorMunch.ITEMS_PER_PAGE = 20;

// default startIndex value
ColorMunch.START_INDEX = 0;

// default timeSpan value
ColorMunch.TIME_SPAN = 0;



/**
 * Comment stores all the data of a Kuler theme comment as returned by the API
 * Properties can be read via explicit getters
 *
 * Creates a new Comment
 * @param text  The comment text
 * @param author  The comment author name
 * @param postedAt  The date the comment was posted
 * @constructor
 */
function ColorMunchComment(text, author, postedAt) {

    "use strict";

    // ************************************************************************
    // PRIVATE VARIABLES
    // ***********************************************************************
    var self = this,
        _text = text,
        _author = author,
        _postedAt = postedAt,
        _posted = new Date(postedAt);


    // ************************************************************************
    // PUBLIC GETTERS
    // ************************************************************************

    /**
     * Get the comment text
     *
     * @return Comment
     *
     */
    self.getText = function() {
        return _text;
    };

    /**
     * Get the comment's author
     *
     * @return Author name
     *
     */
    self.getAuthor = function() {
        return _author;
    };

    /**
     * Get the comment post date as a Date object
     *
     * @return The date the comment was posted
     *
     */
    self.getPostedDate = function() {
        return _posted;
    };

    /**
     * Get the comment post date as a simple string in the format mm/dd/yyyy
     *
     * @return The date the comment was posted
     *
     */
    self.getPostedAt = function() {
        return _postedAt;
    };

}

/**
 * Get main properties in a single data object
 *
 * @return Object
 *
 */
ColorMunchComment.prototype.getData = function() {
    return {
        text: this.getText(),
        author: this.getAuthor(),
        postedDate: this.getPostedDate()
    };
};

/**
 * Override the toString method
 *
 * @return Comment text, author and posted data as a string
 *
 */
ColorMunchComment.prototype.toString = function() {
    return this.getText() + '<br />Author: ' + this.getAuthor() + "<br />Posted: " + this.getPostedAt();
};




/**
 * Swatch stores all the data of a Kuler theme swatch as returned by the API
 * Properties can be read via explicit getters
 *
 * Creates a new Swatch
 * @param hexColor  The hex colour value
 * @param colorMode  The colour mode
 * @param channel1  The Channel 1 value
 * @param channel2  The Channel 2 value
 * @param channel3  The Channel 3 value
 * @param channel4  The Channel 4 value
 * @param swatchIndex  The swatch index
 * @constructor
 */
function ColorMunchSwatch(hexColor, colorMode, channel1, channel2, channel3, channel4, swatchIndex) {

    "use strict";

    // ************************************************************************
    // PRIVATE VARIABLES
    // ***********************************************************************

    var self = this,
        _swatchElement = null,
        _hexIntString = (hexColor.substr(0, 2) === '0x') ? hexColou : '0x' + hexColor,
        _hexColor = (hexColor.substr(0, 2) === '0x') ? hexColor.substr(2) : hexColor,
        _hexInt = parseInt(_hexIntString),
        _colorMode = colorMode,
        _swatchIndex = parseInt(swatchIndex, 10),
        _channels = [
            parseFloat(channel1),
            parseFloat(channel2),
            parseFloat(channel3),
            parseFloat(channel4)
        ],
        _r = _hexInt >> 16 & 255,
        _g = _hexInt >> 8 & 255,
        _b = _hexInt & 255,
        _rgb = {
            r: _r,
            g: _g,
            b: _b
        },
        _brightness = Math.max(_r, _g, _b),
        _isDark = (_brightness < 192);


    // ************************************************************************
    // PUBLIC GETTERS
    // ************************************************************************


    /**
     * Get the hex value of this swatch
     *
     * @return Hex value string
     *
     */
    self.getHexColor = function() {
        return _hexColor;
    };

    /**
     * Get the colour mode of this swatch
     *
     * @return Colour mode
     *
     */
    self.getColorMode = function() {
        return _colorMode;
    };


    /**
     * Get all the channels in one object
     *
     * @return All channels
     *
     */
    self.getChannels = function() {
        return _channels;
    };

    /**
     * Get the swatch index (in relation to the other swatches in the same theme)
     *
     * @return This swatch's index
     *
     */
    self.getIndex = function() {
        return _swatchIndex;
    };

    /**
     * Get the swatch rgb values
     *
     * @return Object containing the rgb values
     *
     */
    self.getRGB = function() {
        return _rgb;
    };

    /**
     * Get the swatch brightness value
     *
     * @return This swatch's brightness value
     *
     */
    self.getBrightness = function() {
        return _brightness;
    };

    /**
     * Get a square shape (20x20) div the colour of this swatch, with a (hidden) span containing the hex value
     *
     * @return Swatch coloured square
     *
     */
    self.getElement = function() {
        if (_swatchElement === null) {
            _swatchElement = document.createElement('div');
            if (_isDark) {
                _swatchElement.setAttribute('class', 'cm-swatch cm-swatch--dark');
            } else {
                _swatchElement.setAttribute('class', 'cm-swatch');
            }
            _swatchElement.style.backgroundColor = '#' + _hexColor;
            _swatchElement.innerHTML = '<span class="cm-swatch-label">' + _hexColor + '</span>';
        }
        return _swatchElement;
    };

    /**
     * Check if this swatch is a dark colour
     * Handy if you're placing text over this colour and want to know whether to use a light or dark colour for the text
     *
     * @return boolean for whether this colour is dark (true) or light (false)
     *
     */
    self.isDark = function() {
        return _isDark;
    };


}

/**
 * Get main properties in a single data object
 *
 * @return Object
 *
 */
ColorMunchSwatch.prototype.getData = function() {
    return {
        hexColor: this.getHexColor(),
        colorMode: this.getColorMode(),
        channels: this.getChannels(),
        rgb: this.getRGB(),
        index: this.getIndex(),
        element: this.getElement(),
        isDark: this.isDark()
    };
};

/**
 * Override the toString method
 *
 * @return hex string value
 *
 */
ColorMunchSwatch.prototype.toString = function() {
    return this.getHexString();
};




/**
 * Theme stores all the data of a Kuler theme as returned by the API
 * Properties can be read via explicit getters
 * Each swatch is stored in a Swatch object
 *
 * Creates a new Theme
 * @param themeId  The theme id
 * @param themeTitle  The theme title
 * @param themeImage  The url of the theme image
 * @param themeLink  The url of the theme on the Adobe Kuler website
 * @param themeCreatedDate  The creation date of the email (yyyy/mm/dd)
 * @param themeEditedDate  The last edited date of the theme (yyyy/mm/dd)
 * @param themeTags  The theme tags
 * @param themeRating  The theme rating
 * @param themeDownloadCount  The theme download count
 * @param themeAuthorId  The theme author id
 * @param themeAuthor  The theme author name
 * @param swatches  The swatches array
 * @param proxyUrl The url of the reverse proxy file
 * @constructor
 */
function ColorMunchTheme(themeId, themeTitle, themeDescription, themeImage, themeLink, themeCreatedDate, themeEditedDate, themeTags, themeRating, themeDownloadCount, themeAuthorId, themeAuthor, swatches, proxyUrl) {

    "use strict";
    ColorMunchEvent.apply(this);

    // ************************************************************************
    // PRIVATE VARIABLES
    // ***********************************************************************

    var self = this,
        _themeElement = null,
        _proxyUrl = proxyUrl,
        _id = themeId,
        _title = themeTitle,
        _description = themeDescription,
        _image = themeImage,
        _link = themeLink,
        _rating = themeRating,
        _downloadCount = themeDownloadCount,
        _author = themeAuthor,
        _authorId = themeAuthorId,
        _tags = themeTags.split(", "),
        _createdDate = new Date(themeCreatedDate.substr(4, 2) + "/" + themeCreatedDate.substr(6, 2) + "/" + themeCreatedDate.substr(0, 4)),
        _editedDate = new Date(themeEditedDate.substr(4, 2) + "/" + themeEditedDate.substr(6, 2) + "/" + themeEditedDate.substr(0, 4)),
        _swatches = [],
        _commentsFeed = null,
        _commentsAreLoaded = false;

    if (_tags.length === 1 && _tags[0] === "") {
        _tags.length = 0;
    }

    __parseSwatches(swatches);

    // ************************************************************************
    // PRIVILEGED METHODS
    // ************************************************************************

    /**
     * Starts the process of loading the comments for this theme
     * The following events may dispatched during the process
     * ColorMunchEvent.FAILED:
     *      - If event.detail.busy === true then the loader is already processing a request
     *      - Else event.detail.message will contain further info on any errors
     * ColorMunchEvent.COMPLETE:
     *      - The result has been parsed and the can now to be read (via the public getters).
     *      - If event.detail.empty === true then there were no results
     *
     * @param startIndex (optional) A 0-based index into the list that specifies the first item to display.
     *              - Default is 0, which displays the first item in the list.
     * @param itemsPerPage (optional) The maximum number of items to display, in the range 1-100.
     *              - Default is 20.
     *
     */
    self.loadThemeComments = function (startIndex, itemsPerPage) {
        // set defaults
        startIndex = (startIndex !== undefined && startIndex !== null) ? startIndex : ColorMunch.START_INDEX;
        itemsPerPage = (itemsPerPage !== undefined && itemsPerPage !== null) ? itemsPerPage : ColorMunch.ITEMS_PER_PAGE;

        _commentsFeed = new ColorMunch(_proxyUrl);
        __addListeners();
        _commentsFeed.loadComments(ColorMunch.COMMENTS_BY_THEME_ID, _themeId, startIndex, itemsPerPage);
    };


    // ************************************************************************
    // PRIVATE FUNCTIONS
    // ***********************************************************************

    /**
     *
     * Parses the array of swatches from the feed result, creating a new ColorMunchSwatch object for each and pushing those into the swatches array
     *
     * @param swatchesData The array of Kuler swatches to parse
     *
     */
    function __parseSwatches(swatchesData) {
        var len = swatchesData.length;
        _swatches = [];
        for (var i = 0; i < len; i++) {
            var swatch = swatchesData[i];
            _swatches.push(new ColorMunchSwatch(
                swatch.swatchHexColor,
                swatch.swatchColorMode,
                swatch.swatchChannel1,
                swatch.swatchChannel2,
                swatch.swatchChannel3,
                swatch.swatchChannel4,
                swatch.swatchIndex
            ));
        }
    }


    /**
     * Adds the comments feed loader listeners
     */
    function __addListeners() {
        _commentsFeed.on(ColorMunchEvent.COMPLETE, __onCommentsFeedDataParsed);
        _commentsFeed.on(ColorMunchEvent.FAILED, __onCommentsFeedError);
    }

    /**
     * Removes the comments feed loader listeners
     */
    function __removeListeners() {
        _commentsFeed.removeEventListener(ColorMunchEvent.COMPLETE, __onCommentsFeedDataParsed);
        _commentsFeed.removeEventListener(ColorMunchEvent.FAILED, __onCommentsFeedError);
    }

    /**
     *
     * Comments Feed event handlers
     *
     */
    function __onCommentsFeedDataParsed(event) {
        __removeListeners();
        _commentsAreLoaded = true;
        var detail = event.detail || {};
        self.emit(ColorMunchEvent.COMPLETE, { detail: detail });
    }

    function __onCommentsFeedError(event) {
        __removeListeners();
        if (event.detail && event.detail.empty) {
            _commentsAreLoaded = true;
        }
        var detail = event.detail || {};
        self.emit(ColorMunchEvent.FAILED, { detail: detail });
    }



    // ************************************************************************
    // PUBLIC GETTERS
    // ***********************************************************************

    /**
     * Get the total number of swatches in this theme
     *
     * @return Number of swatches
     *
     */
    self.getSwatchCount = function() {
        return _swatches.length;
    };

    /**
     * Get the theme ID
     *
     * @return Theme ID
     *
     */
    self.getId = function() {
        return _td;
    };

    /**
     * Get the theme title
     *
     * @return Theme title
     *
     */
    self.getTitle = function() {
        return _title;
    };

    /**
     * Get the theme description. HTML text containing the theme image, artist, id, posted date and hex values
     *
     * @return Theme description
     *
     */
    self.getDescription = function() {
        return _description;
    };

    /**
     * Get the theme image (png file)
     * Note: This is only the url to the theme image
     * If you'd prefer to use a element (div element) see getThemeElement
     *
     * @return String
     *
     */
    self.getImage = function() {
        return _image;
    };

    /**
     * Get all the swatches in this theme
     *
     * @return An array of swatches. Each array item is a ColorMunchSwatch instance
     *
     */
    self.getSwatches = function() {
        return _swatches;
    };

    /**
     * Get a specific ColorMunchSwatch instance from this theme
     *
     * @param index The array index of the swatch
     *
     * @return The specified swatch
     *
     */
    self.getSwatchByIndex = function(index) {
        return (index >= 0 && index < _swatches.length) ? _swatches[index] : null;
    };

    /**
     * Get a random swatch from this theme
     *
     * @return A random swatch
     *
     */
    self.getRandomSwatch = function() {
        if (_swatches.length > 0) {
            var random = Math.floor(Math.random() * (_swatches.length));
            return _swatches[random];
        } else {
            return null;
        }

    };

    /**
     * Get the link (url) to this theme on the Adobe Kuler website
     *
     * @return Theme link/url
     *
     */
    self.getLink = function() {
        return _link;
    };

    /**
     * Get the theme author's name
     *
     * @return Theme author name
     *
     */
    self.getAuthor = function() {
        return _author;
    };

    /**
     * Get the theme author's id
     *
     * @return Theme author ID
     *
     */
    self.getAuthorId = function() {
        return _authorId;
    };

    /**
     * Get the theme's download count
     *
     * @return Theme download count
     *
     */
    self.getDownloadCount = function() {
        return _downloadCount;
    };

    /**
     * Get the theme's rating
     *
     * @return Theme rating
     *
     */
    self.getRating = function() {
        return _rating;
    };

    /**
     * Get the theme tags
     *
     * @return Theme tags. Each array item is of type String
     *
     */
    self.getTags = function() {
        return _tags;
    };

    /**
     * Get the theme's created date
     *
     * @return Theme created date
     *
     */
    self.getCreatedDate = function() {
        return _createdDate;
    };

    /**
     * Get the theme's last edited date
     *
     * @return Theme edited date
     *
     */
    self.getEditedDate = function() {
        return _editedDate;
    };

    /**
     * Get a theme element (div element) containing child elements (divs) of each swatch
     *
     * @return Theme swatches element
     *
     */
    self.getElement = function() {
        if (_themeElement === null) {
            var totalSwatches = _swatches.length,
                square,
                swatch,
                i;

            _themeElement = document.createElement('div');
            _themeElement.setAttribute('id', 'cm-theme_' + _id);
            _themeElement.setAttribute('class', 'cm-theme');
            _themeElement.innerHTML = '<span class="cm-theme-label">' + _title + '</span>';

            for (i = 0; i < totalSwatches; i++) {
                swatch = _swatches[i];
                square = swatch.getElement();
                square.setAttribute('class', square.getAttribute('class') + ' cm-swatch--' + (i+1));
                _themeElement.appendChild(square);
            }

        }
        return _themeElement;
    };


    /**
     * Check if the comments for this theme have been loaded
     *
     * @return boolean value for whether the comments have been loaded or not
     *
     */
    self.getCommentsLoaded = function() {
        return _commentsAreLoaded;
    };


    /**
     * Get the total number of comments for this theme
     *
     * @return Total comments
     *
     */
    self.getCommentCount = function() {
        return (_commentsAreLoaded) ? _commentsFeed.getCommentCount() : -1;
    };


    /**
     * Get all the comments for this theme
     *
     * @return Comments for this theme. Each array item is a ColorMunchComment instance
     *
     */
    self.getAllComments = function() {
        return (_commentsAreLoaded) ? _commentsFeed.getAllComments() : null;
    };

    /**
     * Get a specific comment for this theme
     *
     * @param index The array index of the comment
     *
     * @return The requested comment
     *
     */
    self.getCommentByIndex = function(index) {
        return (_commentsAreLoaded) ? _commentsFeed.getCommentByIndex(index) : null;
    };

    /**
     * Get a random comment for this theme
     *
     * @return Random comment
     *
     */
    self.getRandomComment = function() {
        return (_commentsAreLoaded) ? _commentsFeed.getRandomComment() : null;
    };

}

/**
 * Get main properties in a single data object
 *
 * @return Object
 *
 */
ColorMunchTheme.prototype.getData = function() {
    return {
        element: this.getElement(),
        id: this.getId(),
        title: this.getTitle(),
        description: this.getDescription(),
        image: this.getImage(),
        link: this.getLink(),
        rating: this.getRating(),
        downloadCount: this.getDownloadCount(),
        author: this.getAuthor(),
        authorId: this.getAuthorId(),
        tags: this.getTags(),
        createdDate: this.getCreatedDate(),
        editedDate: this.getEditedDate(),
        swatches: this.getSwatches(),
        commentsLoaded: this.getCommentsLoaded(),
        comments: this.getAllComments()
    };
};

/**
 * Override the toString method
 *
 * @return theme description string containing img, artist, id, posted date, and hex values
 *
 */
ColorMunchTheme.prototype.toString = function() {
    return this.getDescription();
};



/**
 * Custom ColorMunchEvent
 *
 */
function ColorMunchEvent() {
    "use strict";
    var self = this,
        eventList = {};

    self.addEventListener = function (eventName, callback) {
        if (!eventList[eventName]) {
            eventList[eventName] = [];
        }
        eventList[eventName].push(callback);
    };

    self.removeEventListener = function (eventName, callback) {
        var idx = -1;
        if (eventList[eventName]) {
            idx = eventList[eventName].indexOf(callback);
            if(idx !== -1) {
                eventList[eventName].splice(idx, 1);
            }
        }
    };

    self.fireEvent = function (eventName, eventObject) {
        var i,
            eventFunction = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
        if (eventList[eventName]) {
            for(i = 0; i < eventList[eventName].length; i++) {
                eventList[eventName][i](eventObject);
            }
        }
        if (self[eventFunction]) {
            self[eventFunction](eventObject);
        }
    };

    // alias for fireEvent
    self.emit = function (eventName, eventObject) {
        self.fireEvent(eventName, eventObject);
    };

    // alias for addEventListener
    self.on = function (eventName, callback) {
        self.addEventListener(eventName, callback);
    };

    // alias for removeEventListener
    self.un = function (eventName, callback) {
        self.removeEventListener(eventName, callback);
    };
}

// Complete event
ColorMunchEvent.COMPLETE = "complete";

// Failed event
ColorMunchEvent.FAILED = "cm.failed";



/**
 * Utility for loading from the proxy
 *
 * @param proxyUrl Path to the reverse proxy file
 * @constructor
 *
 */
function ColorMunchFeedLoader(proxyUrl) {
    "use strict";
    ColorMunchEvent.apply(this);

    if (proxyUrl === null || proxyUrl === undefined || typeof proxyUrl !== 'string' || proxyUrl === '') {
        throw new Error('ColorMunchFeedLoader(): a valid proxyUrl is required.');
    }

    var self = this,
        _fnName = '',
        _rssTempScript = null,
        _rssUrl = '',
        _rssLoadAttempts = 0,
        _response = null;

    /**
     * Load a Kuler API request via the the proxy
     *
     * The following events may dispatched during the process
     * ColorMunchEvent.FAILED:
     *      - If event.detail.busy === true then the loader is already processing a request
     *      - Else event.detail.message will contain further info on any errors
     * ColorMunchEvent.COMPLETE:
     *      - The result has been returned from the proxy. The event's detail.data will contain the response. You can also get the response from the ColorMunchFeedLoader's getResponse method
     *
     * @param requestUrl The full Kuler API request url with parameters. This is built via the ColorMunch loadThemes, loadComments, searchThemes methods
     *
     */
    self.load = function (requestUrl) {
        if (requestUrl === null || requestUrl === undefined || typeof requestUrl !== 'string' || requestUrl === '') {
            self.emit(ColorMunchEvent.FAILED, { detail: { message: 'load(): a valid requestUrl is required' } });
        }
        _rssUrl = requestUrl;
        __startRequest();
    };

    function __startRequest(isRetry) {
        var fnId = new Date().getTime().toString();
        _fnName = 'onFetchComplete_' + fnId;
        var src = proxyUrl + '?callback=' + _fnName + '&requestid=' + Math.floor(Math.random()*999999).toString() + '&request_url=' + encodeURIComponent(_rssUrl);
        if (_rssTempScript) {
            self.emit(ColorMunchEvent.FAILED, { detail: { message: 'A request is already in progress', busy: true } });
            return;
        }
        if (!isRetry) {
            _rssLoadAttempts = 0;
        }
        _rssTempScript = document.createElement('script');
        _rssTempScript.type = 'text/javascript';
        _rssTempScript.id = 'tempscript_' + fnId;
        _rssTempScript.src = src;
        window[_fnName] = __onFetchComplete;
        document.body.appendChild(_rssTempScript);
    }

    function __onFetchComplete(response) {
        document.body.removeChild(_rssTempScript);
        window[_fnName] = null;
        _rssTempScript = null;
        if ((response.items)) {
            _response = response;
            self.emit(ColorMunchEvent.COMPLETE, { detail: { message: 'Complete', data: response } });
        }
        else if (_rssLoadAttempts++ > 5) {
            self.emit(ColorMunchEvent.FAILED, { detail: { message: 'Request for ' + _rssUrl + ' failed after 5 attempts.' } });
        }
        else {
            // retry
            __startRequest(true);
        }
    }


    /**
     * Get the last response
     *
     * @return response object
     *
     */
    self.getResponse = function () {
        return _response;
    };

}
