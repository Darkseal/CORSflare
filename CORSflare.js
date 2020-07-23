// ----------------------------------------------------------------------------------
// CORSflare - https://github.com/Darkseal/CORSflare
// A lightweight JavaScript CORS Reverse Proxy designed to run in a Cloudflare Worker
// ----------------------------------------------------------------------------------



// ----------------------------------------------------------------------------------
// CONFIGURATION SETTINGS
// ----------------------------------------------------------------------------------

// The hostname of the upstream website to proxy(example: `www.google.com`).
const upstream = 'www.google.com';

// The hostname of the upstream website to proxy for requests coming from mobile devices(example: `www.google.com`).
// if the upstream website doesn't have a dedicated hostname for mobile devices, you can set it to NULL.
const upstream_mobile = null;

// Custom pathname for the upstream website ('/' will work for most scenarios)
const upstream_path = '/';

// An array of countries and regions that won't be able to use the proxy.
const blocked_regions = ['CN', 'KP', 'SY', 'PK', 'CU'];

// An array of IP addresses that won't be able to use the proxy.
const blocked_ip_addresses = ['0.0.0.0', '127.0.0.1'];

// Set this value to TRUE to fetch the upstream website using HTTPS, FALSE to use HTTP.
// If the upstream website doesn't support HTTPS, this must be set to FALSE; also, if the proxy is HTTPS,
// you'll need to enable the replacement_rules rule to HTTPS proxy an HTTP-only website (see below).
const https = true;

// Set to NULL to use the same Cache-Control settings of the upstream pages, or set to one of the allowed values to override them.
// Allowed values include: 'must-revalidate', 'no-cache', 'no-store', 'no-transform', 'public', 'private', 'proxy-revalidate', 'max-age=<seconds>', 's-maxage=<seconds>'.
// ref.: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
const cache_control_override = null;



// ----------------------------------------------------------------------------------
// TEXT REPLACEMENT RULES
// ----------------------------------------------------------------------------------
// The replacement_rules array can be used to configure the text replacement rules
// that will be applied by the proxy before serving any text/html resource back to the user.
// The common usage of such rules is to "fix" non-standard internal URLs and/or local paths
// within the upstream's HTML pages (css, js, internal links, custom fonts, and so on) and force them 
// to pass to the proxy; however, they can also be used to alter the response content in various ways
// (change a logo, modify the page title, add a custom css/js, and so on).

// Each rule must be defined in the following way:

// '<source_string>' : '<replacement_string>'

// The following dynamic placeholder can be used within the source and replacement strings:

// {upstream_hostname}  : will be replaced with the upstream's hostname
// {proxy_hostname}     : will be replaced with this proxy's hostname

// HINT: Rules are processed from top to bottom: put the most specific rules before the generic ones.

const replacement_rules = {

    // enable this rule only if you need to HTTPS proxy an HTTP-only website
    'http://{upstream_hostname}/': 'https://{proxy_hostname}/',

    // this rule should be always enabled (replaces the upstream hostname for internal links, CSS, JS, and so on)
    '{upstream_hostname}': '{proxy_hostname}',

}



// ----------------------------------------------------------------------------------
// MAIN CODE
// ----------------------------------------------------------------------------------

addEventListener('fetch', event => {
    event.respondWith(fetchAndApply(event.request));
})

async function fetchAndApply(request) {
    const region = request.headers.get('cf-ipcountry').toUpperCase();
    const ip_address = request.headers.get('cf-connecting-ip');
    const user_agent = request.headers.get('user-agent');

    let response = null;
    let url = new URL(request.url);
    let url_hostname = url.hostname;

    if (https == true) {
        url.protocol = 'https:';
    } else {
        url.protocol = 'http:';
    }

    if (upstream_mobile && await is_mobile_user_agent(user_agent)) {
        var upstream_domain = upstream_mobile;
    } else {
        var upstream_domain = upstream;
    }

    url.host = upstream_domain;
    if (url.pathname == '/') {
        url.pathname = upstream_path;
    } else {
        url.pathname = upstream_path + url.pathname;
    }

    if (blocked_regions.includes(region)) {
        response = new Response('Access denied: WorkersProxy is not available in your region yet.', {
            status: 403
        });
    } else if (blocked_ip_addresses.includes(ip_address)) {
        response = new Response('Access denied: Your IP address is blocked by WorkersProxy.', {
            status: 403
        });
    } else {
        let method = request.method;
        let request_headers = request.headers;
        let new_request_headers = new Headers(request_headers);

        new_request_headers.set('Host', upstream_domain);
        new_request_headers.set('Referer', url.protocol + '//' + url_hostname);

        let original_response = await fetch(url.href, {
            method: method,
            headers: new_request_headers
        })

        connection_upgrade = new_request_headers.get("Upgrade");
        if (connection_upgrade && connection_upgrade.toLowerCase() == "websocket") {
            return original_response;
        }

        let original_response_clone = original_response.clone();
        let original_text = null;
        let response_headers = original_response.headers;
        let new_response_headers = new Headers(response_headers);
        let status = original_response.status;

        if (cache_control_override) {
            new_response_headers.set('Cache-Control', cache_control_override);
        }

        new_response_headers.set('X-Frame-Options', '*');
        new_response_headers.set('access-control-allow-origin', '*');
        new_response_headers.set('access-control-allow-credentials', true);
        new_response_headers.delete('content-security-policy');
        new_response_headers.delete('content-security-policy-report-only');
        new_response_headers.delete('clear-site-data');

        if (new_response_headers.get("x-pjax-url")) {
            new_response_headers.set("x-pjax-url", response_headers.get("x-pjax-url").replace("//" + upstream_domain, "//" + url_hostname));
        }

        const content_type = new_response_headers.get('content-type');
        if (content_type != null
            && content_type.toLowerCase().includes('text/html')
            && content_type.toLowerCase().includes('utf-8')) {
            original_text = await replace_response_text(original_response_clone, upstream_domain, url_hostname);
        } else {
            original_text = original_response_clone.body;
        }

        response = new Response(original_text, {
            status,
            headers: new_response_headers
        })
    }
    return response;
}

async function replace_response_text(response, upstream_domain, host_name) {
    let text = await response.text()
    var i, j;
    for (i in replacement_rules) {
        j = replacement_rules[i];

        i = i.replace(new RegExp('{upstream_hostname}', 'g'), upstream_domain);
        i = i.replace(new RegExp('{proxy_hostname}', 'g'), host_name);
        j = j.replace(new RegExp('{upstream_hostname}', 'g'), upstream_domain);
        j = j.replace(new RegExp('{proxy_hostname}', 'g'), host_name);

        let re = new RegExp(i, 'g')
        text = text.replace(re, j);
    }
    return text;
}


async function is_mobile_user_agent(user_agent_info) {
    var agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
    for (var v = 0; v < agents.length; v++) {
        if (user_agent_info.indexOf(agents[v]) > 0) {
            return true;
        }
    }
    return false;
}