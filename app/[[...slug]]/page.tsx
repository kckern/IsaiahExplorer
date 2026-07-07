import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { loadGlobalData } from '../../lib/server/dataCache';
import { routeFromParams, isRecognizedRoute } from '../../lib/server/routeFromParams';
import { resolveTagFromSlug } from '../../lib/server/resolveTag';
import { buildMetadata } from '../../lib/server/buildMetadata';
import { subsiteFromHost } from '../../lib/server/subsite';
import { applySubsite } from '../../lib/server/applySubsite';
import { getVerseText } from '../../lib/server/verseText';
import AppClient from './AppClient';

type Props = { params: { slug?: string[] } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isRecognizedRoute(params.slug)) notFound();

  const fullData = await loadGlobalData();
  const route = routeFromParams(params.slug);

  const h = headers();
  const host = h.get('host') ?? 'isaiah.scripture.guide';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;

  const subsite = subsiteFromHost(host);
  const data = applySubsite(fullData, subsite);

  const tagName = resolveTagFromSlug(route.tagSlug, data);
  const verseText = await getVerseText(route.version, route.chapter, route.verse);

  return buildMetadata(
    {
      structure: route.structure,
      outline: route.outline,
      version: route.version,
      chapter: route.chapter,
      verse: route.verse,
      selected_tag: tagName,
      showcase_tag: null,
      searchQuery: route.searchQuery,
      hebrewStrongIndex: route.hebrewStrongIndex,
      commentaryMode: route.commentaryMode,
      commentarySource: route.commentarySource,
      commentaryID: route.commentaryID,
    },
    data,
    origin,
    verseText,
  );
}

export default function Page({ params }: Props) {
  if (!isRecognizedRoute(params.slug)) notFound();
  return <AppClient />;
}
