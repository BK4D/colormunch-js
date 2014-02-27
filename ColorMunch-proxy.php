<?php
// Don't forget your API Key here
define('API_KEY', 'ENTER_YOUR_KULER_API_KEY_HERE');
define('THEMES_API', 'https://kuler-api.adobe.com/feeds/rss/get.cfm');
define('SEARCH_API', 'https://kuler-api.adobe.com/rss/search.cfm');
define('COMMENTS_API', 'https://kuler-api.adobe.com/rss/comments.cfm');

// If you want to try and restrict access to the proxy
// HTTP_REFERER can be spoofed, but it's better than nothing
$allowedDomains = array();
$referer = $_SERVER['HTTP_REFERER'];
$domain = parse_url($referer);

if (count($allowedDomains) > 0 && !in_array( $domain['host'], $allowedDomains)) {

    $output = json_encode(array());
    if (isset($_GET['callback']) && $_GET['callback']) {
        header('Content-Type: text/javascript');
        echo $_GET['callback'] . '(' . $output . ');';
    }
    else {
        header('Content-type: application/json');
        echo $output;
    }

} else {

    if (isset($_GET['request_url']) && !empty($_GET['request_url'])) {
        $allowed_urls = array(
            THEMES_API,
            SEARCH_API,
            COMMENTS_API
        );

        $pos = strpos($_GET['request_url'], '?');
        $base = substr($_GET['request_url'], 0, $pos);

        if (in_array($base, $allowed_urls)) {

            $full_url = $_GET['request_url'] . '&key=' . API_KEY;
            $xml = new SimpleXmlElement($full_url, NULL, true);
            $xmlItems = $xml->channel->xpath('item');

            function parseThemes($xmlItem) {
                $namespaces = $xmlItem->getDocNamespaces();
                $themeData = $xmlItem->children($namespaces['kuler'])->themeItem;
                return array(
                    'title' => trim((string)$xmlItem->title),
                    'link' => trim((string)$xmlItem->link),
                    //'description' => trim((string)$xmlItem->description),
                    'description' => trim(preg_replace('/\s+/', ' ',(string)$xmlItem->description)),
                    'pubDate' => trim((string)$xmlItem->pubDate),
                    'themeID' => trim((string)$themeData->themeID),
                    'themeTitle' => trim((string)$themeData->themeTitle),
                    'themeImage' => trim((string)$themeData->themeImage),
                    'themeAuthor' => (array)$themeData->themeAuthor,
                    'themeTags' => trim(preg_replace('/\s+/', ' ',(string)$themeData->themeTags)),
                    'themeRating' => (float)$themeData->themeRating,
                    'themeDownloadCount' => (int)$themeData->themeDownLoadCount,
                    'themeCreatedAt' => trim((string)$themeData->themeCreatedAt),
                    'themeEditedAt' => trim((string)$themeData->themeEditedAt),
                    'themeSwatches' => (array)$themeData->themeSwatches
                );
            }

            function parseComments($rssItem) {
                $namespaces = $rssItem->getDocNamespaces();
                $commentData = $rssItem->children($namespaces['kuler'])->commentItem;
                return array(
                    'comment' => trim((string)$commentData->comment),
                    'author' => trim((string)$commentData->author),
                    'postedAt' => trim((string)$commentData->postedAt)
                );
            }

            $result = array();
            if ($base == COMMENTS_API) {
                $result['items'] = array_map('parseComments', $xmlItems);
            }
            else {
                $result['items'] = array_map('parseThemes', $xmlItems);
            }

            $output = json_encode($result);

            if (isset($_GET['callback']) && $_GET['callback']) {
                header('Content-Type: text/javascript');
                echo $_GET['callback'] . '(' . $output . ');';
            }
            else {
                header('Content-type: application/json');
                echo $output;
            }
        }
        else {
            $output = json_encode(array());
            if (isset($_GET['callback']) && $_GET['callback']) {
                header('Content-Type: text/javascript');
                echo $_GET['callback'] . '(' . $output . ');';
            }
            else {
                header('Content-type: application/json');
                echo $output;
            }
        }
    }

}
