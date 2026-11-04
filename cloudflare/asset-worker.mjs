// This source is copied into the generated Pages _worker.js, with its release manifest.
export function createAssetWorker(assets, previewBackend = null) {
  const matches = (value, etag, weak = false) => value.split(',').some(item => {
    const tag = item.trim();
    return tag === '*' || (weak ? tag.replace(/^W\//, '') === etag.replace(/^W\//, '') : tag === etag);
  });
  const seconds = date => Math.floor(new Date(date).getTime() / 1000);
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (previewBackend && ['/__preview-backend/api/publishing', '/__preview-backend/api/events'].includes(url.pathname)) {
        // Preview browser requests need the existing public-site Origin. No author cookies or credentials are forwarded.
        if (!['GET', 'HEAD', 'POST', 'OPTIONS'].includes(request.method)) return new Response(null, {status: 405});
        const target = new URL(url.pathname.slice('/__preview-backend'.length) + url.search, previewBackend);
        const headers = new Headers({Origin: 'https://www.lowpolyworks.com'});
        for (const name of ['content-type', 'accept']) if (request.headers.has(name)) headers.set(name, request.headers.get(name));
        const response = await fetch(target, {
          method: request.method, headers, redirect: 'manual',
          body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
        });
        const outgoing = new Headers(response.headers);
        outgoing.delete('set-cookie');
        outgoing.delete('access-control-allow-origin');
        outgoing.set('Cache-Control', 'no-store');
        outgoing.set('X-Robots-Tag', 'noindex');
        return new Response(response.body, {status: response.status, headers: outgoing});
      }
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); }
      catch { return new Response('Bad path', {status: 400}); }
      const asset = assets[pathname];
      if (!asset) return env.ASSETS.fetch(request);
      if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status: 405, headers: {Allow: 'GET, HEAD'}});
      const object = await env.LARGE_ASSETS.head(asset.key);
      if (!object || object.size !== asset.size || object.customMetadata?.sha256 !== asset.sha256) {
        return new Response('Required release asset is unavailable', {status: 503, headers: {'Cache-Control': 'no-store'}});
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Content-Type', asset.type);
      headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      headers.set('ETag', object.httpEtag);
      headers.set('Last-Modified', object.uploaded.toUTCString());
      headers.set('Accept-Ranges', 'bytes');
      headers.set('X-Content-Type-Options', 'nosniff');
      if (previewBackend) headers.set('X-Robots-Tag', 'noindex');
      const noneMatch = request.headers.get('if-none-match'), ifMatch = request.headers.get('if-match');
      if (ifMatch && !matches(ifMatch, object.httpEtag)) return new Response(null, {status: 412, headers});
      const unmodified = request.headers.get('if-unmodified-since');
      if (!ifMatch && unmodified && seconds(object.uploaded) > seconds(unmodified)) return new Response(null, {status: 412, headers});
      if (noneMatch && matches(noneMatch, object.httpEtag, true)) return new Response(null, {status: 304, headers});
      const modified = request.headers.get('if-modified-since');
      if (!noneMatch && modified && seconds(object.uploaded) <= seconds(modified)) return new Response(null, {status: 304, headers});
      let range;
      const rangeHeader = request.headers.get('range'), ifRange = request.headers.get('if-range');
      const useRange = rangeHeader && request.method === 'GET' && (!ifRange || ifRange === object.httpEtag || (!ifRange.includes('"') && seconds(object.uploaded) <= seconds(ifRange)));
      if (useRange) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
        // RFC 9110 permits ignoring unsupported/malformed and multiple ranges.
        if (match && (match[1] || match[2])) {
          let start = match[1] ? Number(match[1]) : Math.max(0, object.size - Number(match[2]));
          let end = match[1] && match[2] ? Math.min(Number(match[2]), object.size - 1) : object.size - 1;
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= object.size || start > end || (!match[1] && Number(match[2]) === 0)) {
            headers.set('Content-Range', `bytes */${object.size}`);
            return new Response(null, {status: 416, headers});
          }
          range = {offset: start, length: end - start + 1};
          headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
        }
      }
      headers.set('Content-Length', String(range ? range.length : object.size));
      if (request.method === 'HEAD') return new Response(null, {headers});
      const body = await env.LARGE_ASSETS.get(asset.key, range ? {range} : undefined);
      if (!body) return new Response('Required release asset is unavailable', {status: 503, headers: {'Cache-Control': 'no-store'}});
      return new Response(body.body, {status: range ? 206 : 200, headers});
    },
  };
}
