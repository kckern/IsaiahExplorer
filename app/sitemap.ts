import type { MetadataRoute } from 'next';
import { loadGlobalData } from '../lib/server/dataCache';
import { sitemapEntries } from '../lib/server/sitemapEntries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await loadGlobalData();
  return sitemapEntries(data);
}
