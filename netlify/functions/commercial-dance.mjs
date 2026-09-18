const UA={"User-Agent":"Mozilla/5.0 KINA-RADAR/16.6","Accept":"text/html"};
const months=["20250919","20251017","20251114","20251212","20260116","20260213","20260313","20260410","20260508","20260612","20260710","20260807","20260911"];
const clean=s=>String(s||"").replace(/&amp;/g,"&").replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
function parse(html){
  const out=[];
  const blocks=html.split(/Number\s+/i).slice(1);
  for(const b of blocks){
    const rank=Number((b.match(/^(\d+)/)||[])[1]); if(!rank||rank>40)continue;
    const peak=Number((b.match(/Peak:\s*(\d+)/i)||[])[1]); if(!peak||peak>5)continue;
    const img=(b.match(/<img[^>]+alt="([^"]+) cover art/i)||[])[1]||"";
    let title=clean(img.replace(/ cover art.*$/i,""));
    const lines=clean(b).split(/\s{2,}|\n/).map(x=>x.trim()).filter(Boolean);
    const p=lines.findIndex(x=>/^Peak:/i.test(x));
    let artist="";
    if(p>1){artist=lines[p-1];}
    if(!title){
      const m=clean(b).match(/^(\d+)\s+(.+?)\s+(.+?)\s+LW:/i);
      if(m){title=m[2];artist=m[3];}
    }
    if(title&&artist)out.push({title,artist,peak,rank});
  }
  return out;
}
async function art(t){
  try{
    const r=await fetch("https://itunes.apple.com/search?term="+encodeURIComponent(t.title+" "+t.artist)+"&entity=song&limit=3");
    const d=await r.json(); const x=d.results?.[0];
    if(x){t.image=x.artworkUrl100?.replace("100x100","300x300")||"";t.releaseDate=x.releaseDate?.slice(0,10)||"";}
  }catch{}
  return t;
}
export default async(req)=>{
  const seen=new Map();
  for(const date of months){
    try{
      const r=await fetch("https://www.officialcharts.com/charts/dance-singles-chart/"+date+"/104/",{headers:UA});
      if(!r.ok)continue;
      for(const t of parse(await r.text())){
        const k=(t.title+"|"+t.artist).toLowerCase();
        const old=seen.get(k);
        if(!old||t.peak<old.peak||t.rank<old.rank)seen.set(k,{...t,chart:"Official UK Dance",qualifiedTop5:true});
      }
    }catch{}
  }
  let tracks=[...seen.values()].sort((a,b)=>a.peak-b.peak||a.rank-b.rank).slice(0,40);
  tracks=await Promise.all(tracks.map(art));
  return new Response(JSON.stringify({version:"16.6",source:"Official Charts Company - Dance Singles",rule:"Only tracks with documented peak 1-5 in sampled weekly charts from the last 12 months",count:tracks.length,tracks}),{headers:{"content-type":"application/json","cache-control":"public,max-age=21600"}});
};
