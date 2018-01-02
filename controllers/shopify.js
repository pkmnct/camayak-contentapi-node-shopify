var request = require('request');

// This file contains secret variables
var keys = require('../keys');

// We are exporting the Shopify functions
var exports = module.exports = {};

// This function handles publish events.
exports.publish = function(webhook, response) {
    // Wrapping in a try-catch so that server won't crash if an error occurs.
    // try {
        if (typeof response.published_id !== 'undefined') {
            // If the published_id is set, then we are updating the post.
            console.log("Attempting to Update Post");
            request_method = "PUT";
            request_uri = "https://" + keys.shopifyAPIkey + ":" + keys.shopifyPassword + "@" + keys.shopifyURL + "/admin/blogs/" + keys.shopifyBlogID + "/articles/" + response.published_id + ".json";
        } else {
            // Otherwise we are publishing the post for the first time.
            console.log("Attempting to Publish Post");
            request_method = "POST";
            request_uri = "https://" + keys.shopifyAPIkey + ":" + keys.shopifyPassword + "@" + keys.shopifyURL + "/admin/blogs/" + keys.shopifyBlogID + "/articles.json";
        }

        // Build the request JSON
        var shopify_request = {
            "article": {}
        }

        // Set the title to heading from Camayak if one exists
        if (typeof response.heading !== 'undefined') {
            shopify_request.article.title = response.heading;
        }

        // Set the summary to subheading from Camayak if one exists
        if (typeof response.subheading !== 'undefined') {
            shopify_request.article.summary_html = response.subheading;
        }

        // Set the author to the first byline from Camayak if one exists
        if (typeof response.bylines !== 'undefined') {
            shopify_request.article.author = response.bylines[0].first_name + " " + response.bylines[0].last_name;
        }

        // Set the body to the content from Camayak if it exists
        if (typeof response.content !== 'undefined') {
            shopify_request.article.body_html = response.content;
        }

        // Set the article image to a featured image from Camayak if one exists
        if (typeof response.media !== 'undefined') {
            for (media in response.media) {
                if (response.media[media].featured) {
                    shopify_request.article.image = {
                        src: response.media[media].url
                    }
                }
            }
        }

        // Set the article SEO meta description if one exists
        if (typeof response.metadata["shopify-meta"] !== 'undefined') {
            if (typeof shopify_request.article.metafields == 'undefined') {
                shopify_request.article.metafields = [];
            } else if (typeof shopify_request.article.metafields["description_tag"] !== 'undefined') {
                for (var i = 0; i < shopify_request.article.metafields.length; i++) {
                    if (shopify_request.article.metafields[i].key == "description_tag") {
                        data.splice(i, 1);
                        break;
                    }
                }
            }
            shopify_request.article.metafields.push({
                "key": "description_tag",
                "value": response.metadata["shopify-meta"],
                "value_type": "string",
                "namespace": "global"
            });
        }

        // Set the page title if one exists
        if (typeof response.metadata["shopify-title"] !== 'undefined') {
            if (typeof shopify_request.article.metafields == 'undefined') {
                shopify_request.article.metafields = [];
            } else if (typeof shopify_request.article.metafields["title_tag"] !== 'undefined') {
                for (var i = 0; i < shopify_request.article.metafields.length; i++) {
                    if (shopify_request.article.metafields[i].key == "title_tag") {
                        data.splice(i, 1);
                        break;
                    }
                }
            }
            shopify_request.article.metafields.push({
                "key": "title_tag",
                "value": response.metadata["shopify-title"],
                "value_type": "string",
                "namespace": "global"
            });
        }

        // Set the URL handle if one exists
        if (typeof response.metadata["shopify-handle"] !== 'undefined') {
            shopify_request.article.handle = response.metadata["shopify-handle"];
        }

        // Set the tags to the tags given from Camayak if they exist
        shopify_request.article.tags = "";
        if (typeof response.taxonomies.Tags !== 'undefined') {
            for (tag in response.taxonomies.Tags.values) {
                shopify_request.article.tags += response.taxonomies.Tags.values[tag].value + ", ";
            }
        }

        // Set the article to published on Shopify
        shopify_request.article.published = true;

        // Construct the correct URL if a handle was given.
        var returnURL = null;
        if (response.metadata["shopify-handle"]) {
            returnURL = keys.shopifyBlogURL + response.metadata["shopify-handle"];
        }

        // Send the built request to Shopify
        request({
            // These are set above depending on if the article is being published or updated
            uri: request_uri,
            method: request_method,
            json: shopify_request
        }, function(error, response, body) {
            // If there isn't an error
            console.log("Response Code: " + response.statusCode);
            if (!error && (response.statusCode == 201 || response.statusCode == 200)) {
                if (typeof response.body.article.id !== "undefined") {
                    thisArticleID = response.body.article.id;
                } else {
                    thisArticleID = response.published_id;
                }
                console.log("Successfully updated or published post with id: " + thisArticleID);
                // If no URL was created from the handle, fall back to the article ID.
                if (!(returnURL)) {
                    returnURL = keys.shopifyBlogURL + thisArticleID;
                }
                // Return the published_id and published_url to Camayak in JSON
                var returnJSON = {
                    published_id: thisArticleID,
                    published_url: returnURL
                };
                return webhook.succeed(returnJSON);
            } else {
                // If there is an error, log it in the console
                console.log("Error updating or publishing post. Details:");
                console.log(error);
                // Return failure to Camayak
                return webhook.fail(body);
            }
        });
    // } catch (error) {
    //     console.log("Error updating or publishing post. Details:");
    //     console.log(error);
    // }
}

// This function handles retract events.
exports.retract = function(webhook, response) {
    // Wrapping in a try-catch so that server won't crash if an error occurs.
    // try {
        if (typeof response.published_id !== 'undefined') {
            console.log("Attempting to retract post with id: " + response.published_id);

            // Build the request
            var shopify_request = {
                "article": {
                    "id": response.published_id,
                    "published": false
                }
            }

            request({
                uri: "https://" + keys.shopifyAPIkey + ":" + keys.shopifyPassword + "@" + keys.shopifyURL + "/admin/blogs/" + keys.shopifyBlogID + "/articles/" + response.published_id + ".json",
                method: 'PUT',
                json: shopify_request
            }, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log("Successfully retracted post with id: " + response.body.article.id);
                    return webhook.succeed({
                        published_id: response.body.article.id
                    });
                } else {
                    console.log("Error retracting post. Details:");
                    console.log(error);
                    return webhook.fail(body);
                }
            });
        } else {
            console.log("Unable to retract post. No id provided.");
        }
    // } catch (error) {
    //     console.log("Error retracting post. Details:");
    //     console.log(error);
    // }
}
