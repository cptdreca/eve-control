import { NextResponse } from 'next/server';

type NewsItem = { title: string; url: string; summary: string; author: string; date: string; image?: string; kind: 'news' | 'patch' };
type PatchItem = { title: string; link: string; description?: string; author?: string; publishingDate: string };

const clean = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const unescapeJson = (value = '') => value.replace(/\\u002F/g, '/').replace(/\\n/g, ' ').replace(/\\"/g, '"');

async function officialNews(): Promise<NewsItem[]> {
  const response = await fetch('https://www.eveonline.com/news', { headers: { Accept: 'text/html' }, next: { revalidate: 900 } });
  if (!response.ok) throw new Error(`News ${response.status}`);
  const html = await response.text();
  const pattern = /"title":"((?:\\.|[^"\\])*)","slug":"((?:\\.|[^"\\])*)","tags":(null|\[[^\]]*\]),"category":"((?:\\.|[^"\\])*)","author":"((?:\\.|[^"\\])*)","publishingDate":"([^"]+)"[\s\S]*?"metaDescription":"((?:\\.|[^"\\])*)","metaImageUrl":(?:null|\{"__typename":"Asset","url":"((?:\\.|[^"\\])*)"\})/g;
  const items: NewsItem[] = [];
  for (const match of html.matchAll(pattern)) {
    const tags = match[3] || '';
    const title = unescapeJson(match[1]);
    if (tags.includes('offers') || /save |sale|bundle/i.test(title)) continue;
    const url = `https://www.eveonline.com/news/view/${match[2]}`;
    if (items.some((item) => item.url === url)) continue;
    items.push({ title, url, summary: clean(unescapeJson(match[7])), author: unescapeJson(match[5]), date: match[6], image: unescapeJson(match[8]), kind: 'news' });
    if (items.length === 6) break;
  }
  return items;
}

async function patchNotes(): Promise<NewsItem[]> {
  const response = await fetch('https://www.eveonline.com/rss/json/patch-notes', { headers: { Accept: 'application/json' }, next: { revalidate: 900 } });
  if (!response.ok) throw new Error(`Patch notes ${response.status}`);
  const items = await response.json() as PatchItem[];
  return items.slice(0, 3).map((item) => ({ title: item.title, url: item.link, summary: clean(item.description).slice(0, 220), author: item.author || 'EVE Online Team', date: item.publishingDate, kind: 'patch' }));
}

export async function GET() {
  const [news, patches] = await Promise.allSettled([officialNews(), patchNotes()]);
  return NextResponse.json({
    news: news.status === 'fulfilled' ? news.value : [],
    patches: patches.status === 'fulfilled' ? patches.value : [],
    source: 'EVE Online',
    updatedAt: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=900' } });
}
