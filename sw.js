/* メシ決めルーレット — オフライン用の最小サービスワーカー。
   方針：自分のファイルだけを precache し、外部（Google Fonts）は取れたらキャッシュ、
   取れなければシステムフォントで動かす。フォントが無くても機能は落ちない。 */
var CACHE = "meshi-v1";
var CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;

  // 本体：ネットワーク優先（更新を拾う）→ 落ちたらキャッシュ
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put("./index.html", copy); });
        return res;
      }).catch(function(){ return caches.match("./index.html"); })
    );
    return;
  }

  // それ以外：キャッシュ優先 → 無ければ取りに行き、取れたら貯める
  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.status === 200 && (res.type === "basic" || res.type === "cors")){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
    })
  );
});
