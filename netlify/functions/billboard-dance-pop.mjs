const H={"User-Agent":"Mozilla/5.0 KINA-RADAR/17.7","Accept":"text/html"};
const clean=s=>String(s||"").replace(/&amp;/g,"&").replace(/&#39;|&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g," ").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
function official(html){
 const out=[];for(const b of html.split(/Number\s+/i).slice(1)){const p=+(b.match(/^(\d+)/)||[])[1];if(!p||p>30)continue;const im=(b.match(/<img[^>]+alt="([^"]+) cover art/i)||[])[1]||"";const title=clean(im.replace(/ cover art.*$/i,""));const tx=clean(b),after=title?tx.slice(tx.toLowerCase().indexOf(title.toLowerCase())+title.length).trim():"";const artist=clean(after.split(/\s+LW:/i)[0]);if(title&&artist)out.push({title,artist,official:p})}return out}
function global(html){
 const out=[]; const text=clean(html);
 // archive exposes repeated title/artist plus Last week/Peak/Weeks metadata
 const re=/([A-Z0-9][A-Z0-9'’().,! ?&+\/-]{1,100})\s+([A-Z0-9][A-Za-z0-9À-ÿ'’().,! ?&+\/-]{1,120})\s+Last week:/g;let m,p=0;
 while((m=re.exec(text))&&p<40){const title=clean(m[1]),artist=clean(m[2]);if(title&&artist){p++;out.push({title,artist,global:p})}}
 return out;
}
const norm=s=>clean(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
async function art(t){try{const r=await fetch("https://itunes.apple.com/search?term="+encodeURIComponent(t.title+" "+t.artist)+"&entity=song&limit=1");const d=await r.json(),x=d.results?.[0];if(x){t.image=x.artworkUrl100?.replace("100x100","300x300")||"";t.previewUrl=x.previewUrl||""}}catch{}return t}
export default async()=>{
 let a=[],b=[];await Promise.all([
 fetch("https://www.officialcharts.com/charts/dance-singles-chart/",{headers:H}).then(async r=>{if(r.ok)a=official(await r.text())}).catch(()=>{}),
 fetch("https://globaldancechart.com/charts/",{headers:H}).then(async r=>{if(r.ok)b=global(await r.text())}).catch(()=>{})
 ]);
 const map=new Map();for(const t of [...a,...b]){const k=norm(t.title);if(!k)continue;const o=map.get(k)||{title:t.title,artist:t.artist};Object.assign(o,t);map.set(k,o)}
 let tracks=[...map.values()].map(t=>{const oa=t.official||50,gb=t.global||50;t.sources=(t.official?1:0)+(t.global?1:0);t.score=(t.official?31-oa:0)+(t.global?41-gb:0)+(t.sources===2?25:0);return t}).sort((x,y)=>y.score-x.score||x.official-y.official||x.global-y.global).slice(0,30).map((t,i)=>({...t,position:i+1}));
 tracks=await Promise.all(tracks.map(art));
 return new Response(JSON.stringify({version:"17.7",source:"Official Dance Singles Chart + Global Dance Chart",rule:"Combined ranking; tracks present in both charts receive a consensus boost",count:tracks.length,tracks}),{headers:{"content-type":"application/json","cache-control":"public,max-age=21600,stale-while-revalidate=86400"}});
};