const H={"User-Agent":"Mozilla/5.0 KINA-RADAR/17.6","Accept":"text/html"};
const URL="https://www.officialcharts.com/charts/dance-singles-chart/";
const clean=s=>String(s||"").replace(/&amp;/g,"&").replace(/&#39;|&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g," ").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
function parse(html){
  const out=[];
  for(const block of html.split(/Number\s+/i).slice(1)){
    const position=Number((block.match(/^(\d+)/)||[])[1]); if(!position||position>20)continue;
    const img=(block.match(/<img[^>]+alt="([^"]+) cover art/i)||[])[1]||"";
    const title=clean(img.replace(/ cover art.*$/i,""));
    const text=clean(block);
    const after=title?text.slice(text.toLowerCase().indexOf(title.toLowerCase())+title.length).trim():"";
    const artist=clean(after.split(/\s+LW:/i)[0]);
    const peak=Number((text.match(/Peak:\s*(\d+)/i)||[])[1])||position;
    if(title&&artist)out.push({position,title,artist,peak});
  }
  return out.slice(0,20);
}
async function art(t){try{const r=await fetch("https://itunes.apple.com/search?term="+encodeURIComponent(t.title+" "+t.artist)+"&entity=song&limit=1");const d=await r.json(),x=d.results?.[0];if(x){t.image=x.artworkUrl100?.replace("100x100","300x300")||"";t.previewUrl=x.previewUrl||""}}catch{}return t}
export default async()=>{
  let tracks=[];try{const r=await fetch(URL,{headers:H});if(r.ok)tracks=parse(await r.text())}catch{}
  tracks=await Promise.all(tracks.map(art));
  return new Response(JSON.stringify({version:"17.6",source:"Official Charts Company - Official Dance Singles Chart",count:tracks.length,tracks}),{headers:{"content-type":"application/json","cache-control":"public,max-age=21600,stale-while-revalidate=86400"}});
};