const SOURCES=[
  {country:"BE",path:"belgium-chart",name:"Ultratop Vlaanderen"},
  {country:"NL",path:"netherlands-chart",name:"NVPI Single Top 100"},
  {country:"FR",path:"france-chart",name:"French Singles"}
];
function key(t){return (t.title+"|"+t.artist).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9|]/g,"");}
function score(entry){let s=92-Math.min(72,(entry.bestPosition-1)*2);s+=Math.min(12,(entry.countries.length-1)*6);if(entry.change>=10)s+=10;else if(entry.change>=5)s+=7;else if(entry.change>=2)s+=4;else if(entry.change>0)s+=2;if(entry.direction==="NEW")s+=8;return Math.max(20,Math.min(100,Math.round(s)));}
function classify(t){if(t.direction==="NEW"||t.change>=5)return"BREAKOUT";if(t.score>=82)return"HOT NOW";if(t.score>=68)return"BREAKOUT";return"RADAR";}
async function source(origin,s){try{const r=await fetch(`${origin}/.netlify/functions/${s.path}`);const d=await r.json();return {...s,active:r.ok&&d.success&&Array.isArray(d.tracks)&&d.tracks.length>0,tracks:Array.isArray(d.tracks)?d.tracks:[],error:d.error||null,diagnostics:d.diagnostics||null};}catch(e){return{...s,active:false,tracks:[],error:e.message};}}
export default async request=>{
  const origin=new URL(request.url).origin;
  const results=await Promise.all(SOURCES.map(s=>source(origin,s)));
  const map=new Map();
  for(const src of results){for(const t of src.tracks.slice(0,50)){const k=key(t);if(!k)continue;const existing=map.get(k);if(!existing){map.set(k,{id:k,title:t.title,artist:t.artist,countries:[src.country],positions:{[src.country]:t.position},bestPosition:t.position||99,lastWeek:t.lastWeek??null,change:t.change??0,direction:t.direction||null,movement:t.movement||null,image:null,spotifyUrl:null,releaseDate:null});}else{if(!existing.countries.includes(src.country))existing.countries.push(src.country);existing.positions[src.country]=t.position;existing.bestPosition=Math.min(existing.bestPosition,t.position||99);if((t.change??0)>existing.change){existing.change=t.change;existing.direction=t.direction;existing.movement=t.movement;}}}}
  let tracks=[...map.values()].map(t=>{const s=score(t);return{...t,score:s,category:classify({...t,score:s})};});
  tracks.sort((a,b)=>b.score-a.score||a.bestPosition-b.bestPosition);tracks=tracks.slice(0,50);
  const hotNow=tracks.filter(t=>t.category==="HOT NOW"),breakout=tracks.filter(t=>t.category==="BREAKOUT");
  const chartSources={};for(const r of results)chartSources[r.country.toLowerCase()]={active:r.active,tracksLoaded:r.tracks.length,error:r.error,diagnostics:r.diagnostics||null};
  return Response.json({version:"10.0",updated:new Date().toISOString(),source:"BE + NL + FR official chart feeds",spotify:{active:false,reason:"Temporarily disabled after Spotify API QUOTA_EXCEEDED"},chartSources,stats:{candidates:map.size,tracks:tracks.length,hotNow:hotNow.length,breakout:breakout.length},tracks,hotNow,breakout},{headers:{"cache-control":"public, max-age=60, s-maxage=1800, stale-while-revalidate=3600"}});
};