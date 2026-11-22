"""Bounded HTTPS requests to explicitly trusted public feed hosts."""

import ipaddress
import socket
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener


def safe_https_url(value):
    if not isinstance(value, str) or not value or len(value) > 4096:
        return ""
    try:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return ""
        if parsed.username or parsed.password or parsed.port not in (None, 80, 443):
            return ""
        return parsed._replace(scheme="https", netloc=parsed.hostname).geturl()
    except ValueError:
        return ""


def validate_destination(url, allowed_hosts):
    parsed = urlparse(url)
    if (parsed.scheme != "https" or parsed.hostname not in allowed_hosts or
            parsed.username or parsed.password or parsed.port not in (None, 443)):
        raise ValueError("Untrusted feed destination")
    addresses = socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
        raise ValueError("Feed destination did not resolve to a public address")


class PublicFeedRedirectHandler(HTTPRedirectHandler):
    def __init__(self, allowed_hosts):
        super().__init__()
        self.allowed_hosts = allowed_hosts

    def redirect_request(self, request, response, code, message, headers, new_url):
        validate_destination(new_url, self.allowed_hosts)
        return super().redirect_request(request, response, code, message, headers, new_url)


def fetch_public_bytes(url, allowed_hosts, *, timeout=30, headers=None, limit=2_000_000):
    validate_destination(url, allowed_hosts)
    opener = build_opener(PublicFeedRedirectHandler(allowed_hosts))
    with opener.open(Request(url, headers=headers or {}), timeout=timeout) as response:
        validate_destination(response.geturl(), allowed_hosts)
        body = response.read(limit + 1)
        if len(body) > limit:
            raise ValueError("Feed response exceeded the size limit")
        return body, response.headers.get_content_charset() or "utf-8"
