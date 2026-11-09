import type { Response } from 'express';
import type { CatalogResponse } from './public-catalog-cache.js';

export function matchesEtag(header: string | undefined, etag: string): boolean {
  const tags = header?.match(/W\/"[^\"]*"|"[^\"]*"|\*/g) ?? [];
  const weak = (value: string) => value.replace(/^W\//, '');
  return tags.some(tag => tag === '*' || weak(tag) === weak(etag));
}

export function sendCatalog(response: Response, result: CatalogResponse): Response {
  response.set({
    ETag: result.etag,
    'Cache-Control': 'public, no-cache',
    'X-Catalog-Cache': result.cache,
    'X-Read-Source': result.source,
  });
  if (matchesEtag(response.req.get('If-None-Match'), result.etag)) return response.status(304).end();
  return response.status(200).type('application/json').send(result.body);
}
