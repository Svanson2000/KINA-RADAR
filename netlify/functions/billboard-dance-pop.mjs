const H={"User-Agent":"Mozilla/5.0 KINA-RADAR/17.8","Accept":"text/html"};
const clean=s=>String(s||"").replace(/&amp;/g,"&").replace(/&#39;|&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g," ").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
const FALLBACK=[
["MOVIN' TO THE SUN","HUGEL, Imael Angel, Ultra Naté"],["MAGNETIC","Bausa"],["ON 2NITE","Silva Bumpa"],["JAMAICAN (BAM BAM)","HUGEL, SOLTO (FR)"],["SHINE","HUGEL, David Guetta, French Montana, Aidan Martin"],["TAKE ME BACK","Kygo, Max McNown"],["NEW RELIGION","Bebe Rexha, Faithless"],["SILVER LINES","ANOTR, Emily Warren"],["MEET ME IN THE DARK","AVE"],["HAPPINESS IS SO SAD","Swedish House Mafia, Lykke Li"],["TALK TO YOU","ANOTR, 54 Ultra"],["GOOD GIRL","Cloonee, Prospa, Tristan Henry"],["HUMAN","David Guetta, Third Party, John Martin"],["WO, MAN","Peggy Gou, Ayra Starr"],["EDGE OF DESIRE","Jonas Blue, Malive"],["MI CHICO","DJ Goja"],["SORRY PAPI","Topic, Becky G"],["WORLD AWAY","Gryffin, BUNT., Inéz"],["TURN THE TIDE","Dimitri Vegas, Sylver, Pat B"],["MY PLACE","Josh Baker, Poppy Baskcomb"],["HEY EVERYBODY (BACK IN THE DANCE)","Kolter"],["SATISFY","Calvin Harris, Jazzy"],["BIZARRE","Madonna, Martin Garrix"],["REPEAT IT","Martin Garrix, Ed Sheeran"],["RMB (Ring My Bell)","Aitch"],["SAD GIRLS","Bebe Rexha, David Guetta"],["WHAT A LIFE","FISHER, Florence Arman"],["IN YOUR EYES","Alesso, OneRepublic"],["COME TO LIFE","Cassian, AR/CO"],["JUST THE WAY YOU ARE","Milky, Mall Grab"]
].map((x,i)=>({title:x[0],artist:x[1],global:i+1}));
function globalParse(html){
 const out=[],seen=new Set();
 // WordPress chart cards expose image alt twice; metadata follows each card.
 const re=/<img[^>]+alt=["']([^"']+)["'][^>]*>[\s\S]{0,1800}?Last week:\s*(?:<[^>]*>)*\s*([^<\s]+)/gi;let m;
 while((m=re.exec(html))&&out.length<40){let title=clean(m[1]).replace(/^Image\s*/i,"");if(!title||/global dance chart/i.test(title))continue;
   const chunk=clean(html.slice(m.index,Math.min(html.length,m.index+2200)));
   const before=chunk.split(/Last week:/i)[0]; const parts=before.split(title).map(clean).filter(Boolean);
   let artist=parts[parts.length-1]||"";artist=artist.replace(/^Image\s*/i,"").trim();
   const k=title.toLowerCase();if(!seen.has(k)&&artist){seen.add(k);out.push({title,artist,global:out.length+1})}
 }
 return out;
}
async function officialParse(){
 try{const r=await fetch("https://www.officialcharts.com/charts/dance-singles-chart/",{headers:H});if(!r.ok)return[];const html=await r.text(),out=[];
 for(const b of html.split(/Number\s+/i).slice(1)){const p=+(b.match(/^(\d+)/)||[])[1];if(!p||p>30)continue;const im=(b.match(/<img[^>]+alt="([^"]+) cover art/i)||[])[1]||"";const title=clean(im.replace(/ cover art.*$/i,""));const tx=clean(b),after=title?tx.slice(tx.toLowerCase().indexOf(title.toLowerCase())+title.length).trim():"";const artist=clean(after.split(/\s+LW:/i)[0]);if(title&&artist)out.push({title,artist,official:p})}return out;
 }catch{return[]}
}
const norm=s=>clean(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
async function art(t){try{const r=await fetch("https://itunes.apple.com/search?term="+encodeURIComponent(t.title+" "+t.artist)+"&entity=song&limit=1");const d=await r.json(),x=d.results?.[0];if(x){t.image=x.artworkUrl100?.replace("100x100","300x300")||"";t.previewUrl=x.previewUrl||""}}catch{}return t}
export default async()=>{
 let g=[];try{const r=await fetch("https://globaldancechart.com/charts/",{headers:H});if(r.ok)g=globalParse(await r.text())}catch{}
 if(g.length<20)g=FALLBACK;
 const o=await officialParse(),map=new Map();
 for(const t of [...g,...o]){const k=norm(t.title);if(!k)continue;const old=map.get(k)||{title:t.title,artist:t.artist};Object.assign(old,t);map.set(k,old)}
 let tracks=[...map.values()].map(t=>{t.sources=(t.global?1:0)+(t.official?1:0);t.score=(t.global?41-t.global:0)+(t.official?31-t.official:0)+(t.sources===2?25:0);return t}).sort((a,b)=>b.score-a.score).slice(0,30).map((t,i)=>({...t,position:i+1}));
 tracks=await Promise.all(tracks.map(art));
 return new Response(JSON.stringify({version:"17.8",source:"Global Dance Chart + Official Dance Singles Chart",count:tracks.length,tracks}),{headers:{"content-type":"application/json","cache-control":"public,max-age=21600,stale-while-revalidate=86400"}});
};