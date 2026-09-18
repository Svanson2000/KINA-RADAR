const H={"User-Agent":"Mozilla/5.0 KINA-RADAR/17.4","Accept":"text/html"};
const clean=s=>String(s||"").replace(/&amp;/g,"&").replace(/&#39;|&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g," ").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
function parse(html){
  const out=[],seen=new Set();
  const rows=[...html.matchAll(/<(?:div|article|li)[^>]*class=["'][^"']*(?:o-chart-results-list__item|chart-results-list__item)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|article|li)>/gi)];
  for(const [,row] of rows){
    const t=clean(row); const pos=Number((t.match(/^\s*(\d{1,2})\b/)||[])[1]); if(!pos||pos>15)continue;
    const hs=[...row.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map(m=>clean(m[1])).filter(Boolean);
    const ps=[...row.matchAll(/<span[^>]*class=["'][^"']*(?:c-label|artist)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)].map(m=>clean(m[1])).filter(Boolean);
    const title=hs[0]||""; const artist=ps.find(x=>x&&!/^LW|PEAK|WEEKS/i.test(x))||"";
    if(title&&!seen.has(title.toLowerCase())){seen.add(title.toLowerCase());out.push({position:pos,title,artist});}
  }
  return out.sort((a,b)=>a.position-b.position).slice(0,15);
}
async function art(t){try{const r=await fetch("https://itunes.apple.com/search?term="+encodeURIComponent(t.title+" "+t.artist)+"&entity=song&limit=1");const d=await r.json(),x=d.results?.[0];if(x){t.image=x.artworkUrl100?.replace("100x100","300x300")||"";t.previewUrl=x.previewUrl||"";}}catch{}return t}
export default async()=>{
  let tracks=[];
  for(const url of ["https://www.billboard.com/charts/hot-dance-pop-songs/","https://ca.billboard.com/charts/hot-dance-pop-songs"]){
    try{const r=await fetch(url,{headers:H});if(r.ok){tracks=parse(await r.text());if(tracks.length)break}}catch{}
  }
  tracks=await Promise.all(tracks.map(art));
  return new Response(JSON.stringify({version:"17.4",source:"Billboard Hot Dance/Pop Songs",count:tracks.length,tracks}),{headers:{"content-type":"application/json","cache-control":"public,max-age=21600,stale-while-revalidate=86400"}});
};