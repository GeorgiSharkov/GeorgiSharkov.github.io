import socket
import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import feed_http
import update_cyber_news_data as news
import update_threat_pulse_data as pulse


class FeedSecurityTests(unittest.TestCase):
    def test_rejects_file_credentials_and_unsupported_schemes(self):
        for value in ("file:///etc/passwd", "javascript:alert(1)", "https://u:p@example.com/", "https://example.com:8080/", ""):
            self.assertEqual(feed_http.safe_https_url(value), "")

    def test_rejects_untrusted_hosts_before_dns_lookup(self):
        with patch.object(socket, "getaddrinfo") as lookup:
            with self.assertRaises(ValueError):
                feed_http.validate_destination("https://attacker.example/", {"trusted.example"})
            lookup.assert_not_called()

    def test_rejects_private_dns_and_redirect_targets(self):
        for address in ("127.0.0.1", "169.254.169.254", "10.0.0.1", "::1", "fd00::1"):
            with patch.object(socket, "getaddrinfo", return_value=[(socket.AF_INET, socket.SOCK_STREAM, 0, "", (address, 443))]):
                with self.assertRaises(ValueError):
                    feed_http.validate_destination("https://trusted.example/", {"trusted.example"})
        handler = feed_http.PublicFeedRedirectHandler({"trusted.example"})
        for target in ("http://trusted.example/", "https://attacker.example/", "file:///etc/passwd"):
            with self.assertRaises(ValueError):
                handler.redirect_request(None, None, 302, "redirect", {}, target)

    def test_oversized_download_is_rejected(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.geturl.return_value = "https://trusted.example/"
        response.read.return_value = b"123456"
        opener = MagicMock()
        opener.open.return_value = response
        with patch.object(feed_http, "validate_destination"), patch.object(feed_http, "build_opener", return_value=opener):
            with self.assertRaises(ValueError):
                feed_http.fetch_public_bytes("https://trusted.example/", {"trusted.example"}, limit=5)
        response.read.assert_called_once_with(6)

    def test_news_feed_rejects_entity_declarations_and_offsite_articles(self):
        with patch.object(news, "fetch_text", return_value='<!DOCTYPE rss [<!ENTITY x "text">]><rss/>'):
            with self.assertRaises(ValueError):
                news.parse_source(news.SOURCES[0])
        xml = '<rss><channel><item><title>Test</title><link>file:///etc/passwd</link></item><item><title>Other</title><link>https://attacker.example/post</link></item></channel></rss>'
        with patch.object(news, "fetch_text", return_value=xml), patch.object(news, "article_metadata") as metadata:
            self.assertEqual(news.parse_source(news.SOURCES[0]), [])
            metadata.assert_not_called()

    def test_optional_map_failure_retains_last_good_snapshot(self):
        previous = {"generatedAt": "2026-11-22", "intervals": {"hour": [], "day": []}}
        with patch.object(pulse, "fetch_radware", side_effect=RuntimeError("unavailable")):
            self.assertIs(pulse.build_radware_snapshot(previous), previous)


if __name__ == "__main__":
    unittest.main()
