# Topic: Internet protocols — IP, TCP/UDP, DNS, TLS

> **Goal:** Explain, concretely, what happens between typing `https://example.com` and the server receiving bytes. Then prove partial understanding by implementing DNS resolution logic.

## Beginner-friendly picks

- 🎥 [Code.org — The Internet: Packets, Routing & Reliability](https://www.youtube.com/@codeorg) — 6-minute animations that make TCP feel obvious
- 📝 [Cloudflare — What is DNS?](https://www.cloudflare.com/learning/dns/what-is-dns/) + [What is TLS?](https://www.cloudflare.com/learning/ssl/transport-layer-security-tls/) — friendlier than RFCs
- 🎥 [Hussein Nasser — networking playlists](https://www.youtube.com/@hnasr) — backend-flavored deep dives when you're ready

## The 5-minute mental model

1. **DNS** turns `example.com` into an IP (possibly via CNAME chains, with caching at every layer).
2. **TCP** (or QUIC) opens a reliable byte pipe to that IP:port — handshake, ordering, retransmission handled for you.
3. **TLS** upgrades the pipe to encrypted + authenticated (certificates, SNI, ALPN).
4. **HTTP** sends a request message over the pipe; response comes back; connection may be reused.

## Core concepts (read in this order)

| Concept | Must be able to answer | Best free resource |
|---|---|---|
| IP & routing basics | IPv4 vs IPv6; why private ranges exist | [karanpratapsingh — IP](https://github.com/karanpratapsingh/system-design#ip) |
| TCP vs UDP | Why HTTP/2 uses TCP but HTTP/3 uses UDP(QUIC)? What does TCP guarantee? | [MDN — intro to networks](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Basic_concepts) · [hpbn.co ch.1-3](https://hpbn.co/building-blocks-of-tcp/) |
| Handshakes | TCP 3-way; TLS 1.3 1-RTT; why handshakes dominate latency on cold connections | [hpbn.co TLS](https://hpbn.co/transport-layer-security-tls/) |
| DNS hierarchy | Root → TLD → authoritative; recursive vs iterative; A/CNAME/TTL; where caching happens (browser→OS→resolver) | [karanpratapsingh — DNS](https://github.com/karanpratapsingh/system-design#domain-name-system-dns) · [howdns.works](https://howdns.works/) (comic, excellent) |
| TLS essentials | What the certificate proves; symmetric vs asymmetric during handshake; SNI | [Cloudflare — what is TLS](https://www.cloudflare.com/learning/ssl/transport-layer-security-tls/) |

## Keep in mind (gotchas seniors hit in production)

- **DNS TTL ≠ safety.** Low TTL eases failover but hammers resolvers; clients may ignore your TTL anyway.
- **CNAME chains cost latency** — each hop can be a separate lookup. Production systems keep chains short (this is exactly your assignment).
- **TCP doesn't know message boundaries.** That's why HTTP has `Content-Length` / chunked encoding — you'll implement both ideas across phase 00–01 assignments.
- **TLS terminates somewhere.** Behind load balancers, "HTTPS" from user ≠ encrypted hop-to-hop internally (mTLS exists for that — revisit in phase 08).
- Connection reuse (keep-alive) is why "first request slow, rest fast" — head-of-line blocking at TCP level motivated HTTP/2 multiplexing, which itself HOL-blocks at packet loss level → motivation for QUIC.

## Self-check quiz

Answer out loud first, then expand.

<details><summary>1. Why does DNS use UDP primarily, and when does it switch to TCP?</summary>
Small request/response fits one datagram — no handshake overhead. Switches to TCP for responses >512B (DNSSEC, huge records) and zone transfers.
</details>

<details><summary>2. Your service resolves a dependency every request. TTL is 300s. Resolver caches are healthy. What's wrong with this picture?</summary>
Nothing fatal, but you've added up-to-one-TTL of stale-routing risk on failover and per-request latency jitter. Services pin connections or cache resolution themselves; also consider happy-eyeballs/dual-stack behavior.
</details>

<details><summary>3. What does a TLS certificate actually prove, and what does it NOT prove?</summary>
Identity binding: this public key belongs to example.com, attested by a CA chain, valid within dates. It does NOT prove the server is trustworthy/secure — only that you're talking to who the cert names.</details>

<details><summary>4. HTTP/2 fixed HTTP/1.1 head-of-line blocking. What HOL problem remains, and what fixes it?</summary>
TCP-level HOL: one lost packet stalls all streams sharing the connection. HTTP/3/QUIC fixes it by making streams independent over UDP with per-stream reliability.
</details>

<details><summary>5. Where would you place the boundary between "network problem" and "application problem" when p50 latency jumped 10x?</summary>
Check layers bottom-up with evidence: DNS resolution times → TCP connect time → TLS handshake time → TTFB. If connect/handshake ballooned → network/DNS/LB; if TTFB only → application/db. (This decomposition IS the interview answer.)
</details>

## Assignment

Head to [assignment.md](assignment.md) — you'll implement CNAME-chain resolution with loop detection and a TTL-aware cache. It's pure logic, no network, fully test-driven.
