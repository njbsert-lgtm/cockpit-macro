import { describe, expect, it } from "vitest";
import { parseFeed } from "./rss";

describe("parseFeed — RSS", () => {
  it("extrait titre, lien et date de chaque <item>", () => {
    const xml = `
      <rss><channel>
        <item>
          <title>La Fed relève son taux directeur</title>
          <link>https://example.org/fed</link>
          <pubDate>Sat, 15 Aug 2026 12:00:00 GMT</pubDate>
        </item>
      </channel></rss>
    `;
    const entries = parseFeed(xml);
    expect(entries).toEqual([
      {
        title: "La Fed relève son taux directeur",
        link: "https://example.org/fed",
        publishedAt: new Date("Sat, 15 Aug 2026 12:00:00 GMT").toISOString(),
      },
    ]);
  });

  it("décode le CDATA et les entités dans le titre", () => {
    const xml = `
      <item>
        <title><![CDATA[Taux & inflation : "l'écart" se creuse]]></title>
        <link>https://example.org/a</link>
        <pubDate>Sat, 15 Aug 2026 12:00:00 GMT</pubDate>
      </item>
    `;
    expect(parseFeed(xml)[0].title).toBe(`Taux & inflation : "l'écart" se creuse`);
  });

  it("écarte un item sans date exploitable plutôt que d'en inventer une", () => {
    const xml = `
      <item>
        <title>Sans date</title>
        <link>https://example.org/a</link>
      </item>
    `;
    expect(parseFeed(xml)).toHaveLength(0);
  });
});

describe("parseFeed — Atom", () => {
  it("lit le lien depuis l'attribut href d'une balise auto-fermante", () => {
    const xml = `
      <feed>
        <entry>
          <title>Communiqué de la BCE</title>
          <link href="https://example.org/bce" rel="alternate" />
          <updated>2026-08-15T12:00:00Z</updated>
        </entry>
      </feed>
    `;
    const entries = parseFeed(xml);
    expect(entries).toEqual([
      {
        title: "Communiqué de la BCE",
        link: "https://example.org/bce",
        publishedAt: "2026-08-15T12:00:00.000Z",
      },
    ]);
  });
});
