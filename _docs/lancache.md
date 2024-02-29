---
title: "LanCache"
date: 2024-02-29
---

[LanCache](https://lancache.net/) is a service that caches copies of games on a fast local server and redirects traffic to/from popular game sites to provide a faster download experience for cached games. We've set up an instance in a dedicated VM so Swarthmore students and community members can take better advantage of our fancy new hardware. It's pretty easy to set this up--just requires swapping your DNS servers to `130.58.218.30`, the IP address of our VM. We'll go a bit into how it works and how to set it up in case you're curious.

## How it Works

The Internet uses a concept called DNS (Domain Name System) to determine the IP (Internet Protocol) address of a host given a URL. It's kinda like a distributed phone book...or a game of telephone. The idea is basically that for a given URL, there exists some "root authority" that is the source of truth for where to point, and then there are servers that are faster and spread out around the globe that cache these names so you don't have to go hunting. Those servers, hosted by companies like Google and Cloudflare, go hunting for root authorities so you don't have to (fewer bounces is better!).

When you go to download a game, your PC queries DNS for the download server (i.e. `content1.steampowered.com`). It checks its own local cache, followed by the primary DNS server, followed by the secondary DNS server, until it is found. LanCache basically redirects everything to normal DNS servers other than these game sites, which it pretends to be the root authority for. Traffic for those sites is redirected to a web sever hosted on the LanCache server, which checks the cache and either downloads from there or queries the normal site (in the event of a cache miss). As you might imagine, these misses happen a lot until the cache populates.

## Get Set Up

Getting connected to the LanCache is pretty easy--just swap your primary DNS to `130.58.218.30` and your secondary to whichever you prefer (probably ITS's DNS at `130.58.218.18`).

Windows 11:

1. Open Settings
2. Navigate to Network & Internet --> Wi-Fi (or Ethernet depending on your connection) --> eduroam (if on Wi-Fi)
3. Hit Edit on the DNS server assignment section, swap to Manual, and set the IPv4 addresses as shown above.

NOTE: DO NOT enable DNS over HTTPS. ITS disables this and we don't support it.

macOS Ventura:

1. Open System Settings
2. Navigate to Network & Internet --> Wi-Fi (or Ethernet depending on your connection) --> Details --> DNS
3. Set the DNS servers as shown above

Linux:

If you're using a Linux distro you probably know how to set this up.

Consoles can also use this but we won't put instructions for every possible console--refer to your manufacturer's instructions.
