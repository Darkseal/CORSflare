# CORSflare
A lightweight JavaScript CORS Reverse Proxy designed to run in a Cloudflare Worker.

## Introduction
CORSflare is a reverse proxy written in JavaScript that can be used to bypass most common Cross-Request-Resource-Sharing restrictions,
such as:

* **Frame/Iframe**: *Refused to display [some URL] in a frame because it is set 'X-Frame-Options' to 'SAMEORIGIN'*
* **XMLHttpRequest**: *XMLHttpRequest cannot load [some URL]. Origin [some origin] is not allowed by Access-Control-Allow-Origin*

... And so on.

### Wait a minute... what is CORS?
If you've stumbled upon this project there's a high chance you already know what CORS actually is 
and why you need to bypass such policies: if that's the case, just skip this section and go ahead.

In the unlikely case you don't, just know that *Cross-Origin Resource Sharing* (CORS) is a mechanism that uses 
additional HTTP headers to tell browsers to give a web application running at one origin, 
access to selected resources from a different origin.

A web page executes a *cross-origin* HTTP request when it requests a resource that has a different origin
(domain, protocol, or port) from its own. For security reasons, modern browsers restrict some of those cross-origin HTTP requests 
(such as `scripts`, `iframe`, and JS-initiated requests such as `XMLHttpRequest` and `Fetch API` calls) because they could 
be abused in various ways. These restrictions are applied using a `same-origin` policy, which explicitly prevents the browser
from requesting those kind of resources unless they come from the *same origin* (FQDN) of the HTML page (or script) that tries 
to load them.

The screenshot below demonstrates such concept in a visual way:

![Cross-Origin Requests](https://mdn.mozillademos.org/files/14295/CORS_principle.png)

The only way to overcome the same-origin` policy is to ensure that the requested resource from other origins 
includes the right HTTP headers, such as the following ones:
* [Access-Control-Allow-Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin),
which indicates whether the response can be shared with requesting code from the given origin.
* [X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options), that can be used to indicate 
whether or not a browser should be allowed to render a page in a `<frame>`, `<iframe>`, `<embed>` or `<object>`.

If you can access (or ask) the server hosting the "other origin" resources and configure those headers to authorize your domain,
there's a high chance you don't need to use this proxy or other workarounds: that's the proper (and most efficient) way to fix
your issue.

Conversely, if you don't have access to those resources and/or can't change their HTTP headers, you might find 
the CORSflare Reverse Proxy useful enough, since it's specifically designed to remove such limitations.

## Usage
To setup CORSflare within a Cloudflare Worker, follow these steps:
* **Login to Cloudflare**. if you don't have an account, create one: it's free 
and the basic plan will arguably be enough for most common scenarios, as it will grant 100.000 requests per day.
* **Navigate to the Workers section**
* **Create a new worker**. If it's the first time you do that, you'll also be asked to choose a subdomain, such as `domainName.workers.dev`.
The subdomain name will be appended to the worker's name to form the worker's FQDN, such as `workerName.domainName.workers.dev`.
* **Paste the CORSflare.js source code within the worker code**.
* **Setup the CORSflare configuration settings** by following the instructions in the code comment sections (or see below).

## Configuration Settings
CORSflare's configuration settings can be set via some JavaScript constants & variables placed at the beginning of the source code.
The best way to do that is to read the code comments. However, here's a quick breakdown of the most relevant options:

* **upstream** : the hostname of the website to retrieve for users (example: 'www.google.com')
* **upstream_mobile** : The hostname of the website to retrieve for users using mobile devices (example: 'www.google.com')
* **upstream_path** : Custom pathname for the upstream website ('/' will work for most scenarios).
* **blocked_regions** : An array of countries and regions that won't be able to use the proxy.
* **blocked_ip_addresses** : An array of IP addresses that won't be able to use the proxy.
* **https** : Set this value to TRUE to fetch the upstream website using HTTPS, FALSE to use HTTP.
If the upstream website doesn't support HTTPS, this must be set to FALSE; also, if the proxy is HTTPS,
you'll need to enable the replace_dict rule to HTTPS proxy an HTTP-only website (see below).
* **cache_control_override** : Set to NULL to use the same [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) settings of the upstream pages, 
or set to one of the allowed values to override them.
Allowed values include: `must-revalidate`, `no-cache`, `no-store`, `no-transform`, `public`, `private`, `proxy-revalidate`, `max-age=<seconds>`, `s-maxage=<seconds>`.
* **replacement_rules** : Can be used to define custom text replacement rules (see section below).
 

### Text Replacement Rules
The `replacement_rules` array can be used to configure the text replacement rules
that will be applied by the proxy before serving any text/html resource back to the user.

The common usage of such rules is to "fix" non-standard internal URLs and/or local paths
within the upstream's HTML pages (css, js, internal links, custom fonts, and so on) and force them 
to pass to the proxy; however, they can also be used to alter the response content in various ways
(change a logo, modify the page title, add a custom css/js, and so on).

Each rule must be defined in the following way:

    '<source_string>' : '<replacement_string>'

The following dynamic placeholder can be used within the source and replacement strings:

* `{upstream_hostname}` : will be replaced with the upstream's hostname
* `{proxy_hostname}` : will be replaced with this proxy's hostname

**HINT**: Rules are processed from top to bottom: put the most specific rules before the generic ones.

## Credits
CORSflare is strongly based upon the following projects:
* [worker-proxy](https://github.com/Berkeley-Reject/workers-proxy/) by [Berkeley-Reject](https://github.com/Berkeley-Reject) (MIT License)
* [cloudflare-cors-anywhere](https://github.com/Zibri/cloudflare-cors-anywhere) by [Zibri](https://github.com/Zibri) (MIT License)
