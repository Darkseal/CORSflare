# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2020-07-25

### Removed
- HTTP to HTTPS replacement has been commented out, since it won't be required in most common scenarios.

## [1.0.1] - 2020-07-23

### Added
- `http_response_headers_set` and `http_response_headers_delete` option switches.

### Fixed
- bug in handling the Cloudflare-specific `cf-ipcountry` HTTP header. 

### Removed
- `cache_control_override` switch: no longer required as the new `http_response_headers_set` option can be used to handle the `Cache-Control` header in a better way.

## [1.0.0] - 2020-07-22

- Initial release