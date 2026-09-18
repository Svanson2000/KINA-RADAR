const H={"User-Agent":"Mozilla/5.0 (compatible; KINARadar/16.8)","Accept":"text/html"};
const clean=s=>String(s||"").replace(/&amp;/g,"&").replace(/&#39;|&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g," ").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
function isoWeeks(y){const a=[];for(let w=1;w<=53;w++){const d=new Date(Date.UTC(y,0,4));d.setUTCDate(d.getUTCDate()+(w-1)*7-(d.getUTCDay()||7)+6);if(d.getUTCFullYear()>y&&w>52)break;a.push({w,date:d})}return a}
function parse(html,date){
  const out=[];
  // Acharts chart rows: position + title link + artist text.
  const rows=html.split(/class=["'][^"']*(?:chart_item|chartitem|cPosition)[^"']*["']/i).slice(1);
  for(const row of rows){
    const text=clean(row.slice(0,5000));
    const pm=text.match(/^\s*([1-3])(?:\.|\s)/); if(!pm)continue;
    const pos=+pm[1];
    const links=[...row.slice(0,5000).matchAll(/<a[^>]+href=["'][^"']*(?:song|track)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>clean(m[1])).filter(Boolean);
    let title=links[0]||"";
    let artist=links[1]||"";
    if(!artist){
      const m=text.match(/^[1-3]\.?(?:\s*\([^)]*\))?\s*\d*\s*(.+?)\s+peak position:/i);
      if(m){const bits=m[1].split(/\s{2,}/);title=title||bits[0]||"";artist=bits[1]||""}
    }
    if(title)out.push({position:pos,title,artist,date:date.toISOString().slice(0,10)});
    if(out.length===3)break;
  }
  // Fallback tuned to visible Acharts text structure.
  if(out.length<3){
    const t=clean(html);
    const re=/(?:^|\s)([1-3])\.\s*\([^)]*\)\s*\d*\s*([^|]{1,120}?)\s+peak position:\s*\d+/gi;let m;
    while((m=re.exec(t))&&out.length<3){out.push({position:+m[1],title:clean(m[2]),artist:"",date:date.toISOString().slice(0,10)})}
  }
  return out;
}
async function getWeek(year,w,date){
  try{const r=await fetch("https://acharts.co/belgium_singles_top_50/"+year+"/"+w,{headers:H});if(!r.ok)return[];return parse(await r.text(),date)}catch{return[]}
}
export default async req=>{
  const u=new URL(req.url),now=new Date(),year=Math.max(2000,Math.min(now.getUTCFullYear(),+(u.searchParams.get("year")||now.getUTCFullYear())));
  // Acharts weekly archive is dependable from 2003. Older years remain explicitly marked unavailable.
  if(year<2003)return new Response(JSON.stringify({version:"16.8",year,source:"Ultratop Vlaanderen",months:[],count:0,note:"Het gekoppelde weekarchief start in 2003; 2000-2002 worden apart geïmporteerd."}),{headers:{"content-type":"application/json","cache-control":"public,max-age=86400"}});
  const weeks=isoWeeks(year).filter(x=>x.date<=now),all=[];
  for(let i=0;i<weeks.length;i+=6){const part=await Promise.all(weeks.slice(i,i+6).map(x=>getWeek(year,x.w,x.date)));part.forEach(x=>all.push(...x))}
  const names=["JANUARI","FEBRUARI","MAART","APRIL","MEI","JUNI","JULI","AUGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DECEMBER"];
  const months=names.map((name,i)=>{
    const map=new Map();
    all.filter(t=>new Date(t.date+"T00:00:00Z").getUTCMonth()===i).forEach(t=>{const k=(t.title+"|"+t.artist).toLowerCase();const o=map.get(k);if(!o)map.set(k,{...t,best:t.position,weeksTop3:1});else{o.best=Math.min(o.best,t.position);o.weeksTop3++}});
    return {month:i+1,name,tracks:[...map.values()].sort((a,b)=>a.best-b.best||b.weeksTop3-a.weeksTop3)};
  }).filter(m=>m.tracks.length);
  return new Response(JSON.stringify({version:"16.8",year,source:"Ultratop Vlaanderen via Acharts weekly archive",rule:"Alle unieke singles die tijdens minstens één week van de maand op positie 1, 2 of 3 stonden.",count:months.reduce((n,m)=>n+m.tracks.length,0),months}),{headers:{"content-type":"application/json","cache-control":"public,max-age=86400"}});
};