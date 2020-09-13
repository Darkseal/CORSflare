# CORSflare
A lightweight JavaScript CORS Reverse Proxy designed to run in a Cloudflare Worker.

## Introduction
CORSflare is a reverse proxy written in JavaScript that can be used to bypass most common Cross-Origin Resource Sharing restrictions,
such as:

* **Frame/Iframe**: *Refused to display [some URL] in a frame because it is set 'X-Frame-Options' to 'SAMEORIGIN'*
* **XMLHttpRequest**: *XMLHttpRequest cannot load [some URL]. Origin [some origin] is not allowed by Access-Control-Allow-Origin*

... And so on.

The proxy has been designed to run within a Cloudflare Worker, which is freely available for up to 100.000 requests per day;
this basically means that you can use this proxy to put any external web page within a `<iframe>` element, 
and/or call a external API via AJAX, and/or to bypass any common CORS restriction without spending a penny, 
assuming you don't have enterprise-grade service level requirements.

### Wait a minute... what is CORS?
If you've stumbled upon this project there's a high chance you already know what CORS actually is 
and why you need to bypass such policies: if that's the case, just skip this section and go ahead.

In the unlikely case you don't, just know that *Cross-Origin Resource Sharing* (CORS) is a mechanism that uses 
additional HTTP headers to tell browsers to give a web application running at one origin, 
access to selected resources from a different origin.

A web page executes a *cross-origin* HTTP request when it requests a resource that has a different origin
(domain, protocol, or port) from its own. For security reasons, modern browsers restrict some of those cross-origin HTTP requests 
(`script`, `iframe`, JS-initiated requests such as `XMLHttpRequest` and `Fetch API` calls, and so on) because they could 
be abused in various ways. These restrictions are applied using a `same-origin` policy, which explicitly prevents the browser
from requesting those kind of resources unless they come from the *same origin* (FQDN) of the HTML page (or script) that tries 
to load them.

The following diagram explains such concept in a visual way:

![Cross-Origin Requests](https://mdn.mozillademos.org/files/14295/CORS_principle.png)

The only way to overcome the same-origin` policy is to ensure that the requested resource from other origins 
includes the right HTTP headers, such as the following ones:
* [Access-Control-Allow-Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin),
which indicates whether the response can be shared with requesting code from the given origin.
* [X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options), that can be used to indicate 
whether or not a browser should be allowed to render a page in a `<frame>`, `<iframe>`, `<embed>` or `<object>` HTML element.

If you can access (or ask) the server hosting the "other origin" resources and configure those headers to authorize your domain,
there's a high chance you don't need to use this proxy or other workarounds: that's the proper (and most efficient) way to fix
your issue.

Conversely, if you don't have access to those resources and/or can't change their HTTP headers, you might find 
the CORSflare Reverse Proxy useful enough, since it's specifically designed to remove such limitations.

## How it works

Here's a diagram that shows how the CORS reverse proxy actually works:

![CORS Reverse Proxy](https://www.ryadel.com/wp-content/uploads/2020/07/cors-reverse-proxy-diagram.png)

In a nutshell, the proxy will respond to the preflight request issued by the *Front End App* (for example, a web browser) 
by setting the "CORS allowed" headers: right after that, it will forward the request to the target server, receive its response 
and send them back to the client app without the `same-origin` limitations.

Moreover, **CORSflare** can also be configured to perform some other additional tasks, such as ''on-the-fly'' text replacing 
(to handle inner links, URLs and so on), cache control overrides, blacklist traffic coming from certain regions / countries IP addresses, 
and so on.

## How to install
To setup CORSflare within a Cloudflare Worker, follow these steps:
* **Download the latest CORSflare version** from the CORSflare GitHub page: you'll only need the `CORSflare.js` JavaScript file.
* **Login to Cloudflare**. If you don't have an account, create one: it's free 
and the basic plan will arguably be enough for most common scenarios, as it will grant 100.000 requests per day.
* **Navigate to the *Workers* section** using the top-level menu.
* **Create a new worker**. If it's the first time you do that, you'll also be asked to choose a subdomain, such as `domainName.workers.dev`.
The subdomain name will be appended to the worker's name to form the worker's FQDN, such as `workerName.domainName.workers.dev`.
* **Paste the CORSflare.js source code within the worker code**.
* **Setup the CORSflare configuration settings** by following the instructions in the code comment sections (or see below).

## Configuration Settings
CORSflare's configuration settings can be set via some JavaScript constants & variables placed at the beginning of the source code.
The best way to do that is to read the code comments. However, here's a quick breakdown of the most relevant options:

* **upstream** : The hostname of the upstream website to proxy (example: `www.google.com`).
* **upstream_mobile** : the hostname of the upstream website to proxy for requests coming from mobile devices (example: `www.google.com`);
if the upstream website doesn't have a dedicated hostname for mobile devices, you can set it to NULL.
* **upstream_path** : custom pathname for the upstream website ('/' will work for most scenarios).
* **upstream_allow_override**: set it to TRUE to allow the default upstream to be overridden with a customizable GET parameter, FALSE otherwise.
* **upstream_get_parameter**: the GET parameter that can be used to override the default upstream if `upstream_allow_override` is set to TRUE (default is `CORSflare_upstream`).
* **blocked_regions** : an array of countries and regions that won't be able to use the proxy.
* **blocked_ip_addresses** : an array of IP addresses that won't be able to use the proxy.
* **https** : set this value to TRUE to fetch the upstream website using HTTPS, FALSE to use HTTP.
If the upstream website doesn't support HTTPS, this must be set to FALSE; also, if the proxy is HTTPS,
you'll need to enable the replace_dict rule to HTTPS proxy an HTTP-only website (see below).
* **http_response_headers_set** : an array of HTTP Response Headers to add (or to update, in case they're already present 
in the upstream response); this option can be used to circumvent the `same-origin` policy 
because it allows to set the `X-Frame-Options` and `Access-Control-Allow-Origin` headers to allow cross-origin requests.
* **http_response_headers_delete** : an array of HTTP Response Headers to delete (if present in the upstream response);
this option can be used to circumvent the `same-origin` policy because it allows to remove the `Content-Security-Policy` headers before serving the upstream pages to the end-user client.
* **replacement_rules** : Can be used to define custom text replacement rules (see section below).
* **replacement_content_types** : Can be used to specify the returned content's content-type(s) to apply
the `replacement_rules` to.
* **replacement_use_regex** : Can be used to enable or disable RegEx syntax in replacement rules.

### Text Replacement Rules
The `replacement_rules` array can be used to configure the text replacement rules
that will be applied by the proxy before serving any text/html resource back to the user.

The common usage of such rules is to "fix" non-standard internal URLs and/or local paths
within the upstream's returned contents (html pages, css, js, internal links, custom fonts, and so on,
depending on the content type(s) specified in the `replacement_content_types` array) and force them 
to pass to the proxy; however, they can also be used to alter the response content in various ways
(change a logo, modify the page title, add a custom css/js, and so on).

Each rule must be defined in the following way:

    '<source_string>' : '<replacement_string>'

The following dynamic placeholder can be used within the source and replacement strings:

* `{upstream_hostname}` : will be replaced with the upstream's hostname
* `{proxy_hostname}` : will be replaced with this proxy's hostname

**HINT**: Rules are processed from top to bottom: put the most specific rules before the generic ones.

## Useful References
* [CORSflare official project page](https://www.ryadel.com/en/portfolio/corsflare/)
* [CORSflare setup guide](https://www.ryadel.com/en/corsflare-free-cors-reverse-proxy-bypass-same-origin/)
* [CORSflare's GitHub page](https://github.com/Darkseal/CORSflare)

## Credits
CORSflare is strongly based upon the following projects:
* [worker-proxy](https://github.com/Berkeley-Reject/workers-proxy/) by [Berkeley-Reject](https://github.com/Berkeley-Reject) (MIT License)
* [cloudflare-cors-anywhere](https://github.com/Zibri/cloudflare-cors-anywhere) by [Zibri](https://github.com/Zibri) (MIT License)
