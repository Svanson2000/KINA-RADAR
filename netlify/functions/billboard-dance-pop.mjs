const H={"User-Agent":"Mozilla/5.0 KINA-RADAR/17.5","Accept":"text/html"};
const clean=s=>String(s||"").replace(/&amp;/g,"&").replace(/&#39;|&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g," ").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
function parse(html){
  const out=[],seen=new Set();
  // Billboard Canada exposes charts as semantic headings: position, h2 title, h3 artist.
  const re=/(?:^|>)(\d{1,2})\s*(?:<[^>]+>\s*)*<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]{0,1800}?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  let m; while((m=re.exec(html))){
    const position=+m[1]; if(position<1||position>15)continue;
    const title=clean(m[2]),artist=clean(m[3]),k=(title+"|"+artist).toLowerCase();
    if(title&&artist&&!seen.has(k)){seen.add(k);out.push({position,title,artist});}
  }
  // JSON-LD / hydration fallback: extract chart item title/artist pairs near rank.
  if(out.length<5){
    const t=html.replace(/\\u0026/g,"&").replace(/\\u0027/g,"'");
    const jr=/"rank"\s*:\s*"?([1-9]|1[0-5])"?[\s\S]{0,700}?"title"\s*:\s*"([^"]+)"[\s\S]{0,700}?"artist"\s*:\s*"([^"]+)"/gi;
    while((m=jr.exec(t))){const position=+m[1],title=clean(m[2]),artist=clean(m[3]),k=(title+"|"+artist).toLowerCase();if(!seen.has(k)){seen.add(k);out.push({position,title,artist})}}
  }
  return out.sort((a,b)=>a.position-b.position).slice(0,15);
}
async function artwork(t){try{const r=await fetch("https://itunes.apple.com/search?term="+encodeURIComponent(t.title+" "+t.artist)+"&entity=song&limit=1");const d=await r.json(),x=d.results?.[0];if(x){t.image=x.artworkUrl100?.replace("100x100","300x300")||"";t.previewUrl=x.previewUrl||""}}catch{}return t}
export default async()=>{
  let tracks=[],source="";
  const urls=["https://ca.billboard.com/charts/hot-dance-pop-songs","https://www.billboard.com/charts/hot-dance-pop-songs/"];
  for(const url of urls){try{const r=await fetch(url,{headers:H});if(!r.ok)continue;tracks=parse(await r.text());if(tracks.length){source=url;break}}catch{}}
  if(!tracks.length){
    return new Response(JSON.stringify({version:"17.5",source:"Billboard Hot Dance/Pop Songs",count:0,tracks:[],error:"Billboard chart markup unavailable"}),{status:200,headers:{"content-type":"application/json","cache-control":"public,max-age=300"}});
  }
  tracks=await Promise.all(tracks.map(artwork));
  return new Response(JSON.stringify({version:"17.5",source,count:tracks.length,tracks}),{headers:{"content-type":"application/json","cache-control":"public,max-age=21600,stale-while-revalidate=86400"}});
};