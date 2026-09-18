const H={"User-Agent":"Mozilla/5.0 KINA-RADAR/16.7","Accept":"text/html"};
const clean=s=>String(s||"").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&#39;|&#x27;/g,"'").replace(/&quot;/g,'"').replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
function saturdays(year){
  const a=[];let d=new Date(Date.UTC(year,0,1));while(d.getUTCDay()!=6)d.setUTCDate(d.getUTCDate()+1);
  while(d.getUTCFullYear()===year){a.push(d.toISOString().slice(0,10).replaceAll("-",""));d.setUTCDate(d.getUTCDate()+7)}return a;
}
function parse(html,date){
  const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
  const out=[];
  for(const row of rows){
    const cells=[...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
    if(cells.length<5)continue;
    const pos=Number(cells[0]);if(pos<1||pos>3)continue;
    // print chart columns: #, VW, W, Artist, Title, Label, Distributor, HP
    out.push({position:pos,artist:cells[3],title:cells[4],date,peak:pos});
  } return out;
}
async function week(date){
  try{
    const r=await fetch("https://www.ultratop.be/print.asp?cat=s&date="+date+"&lang=nl",{headers:H});
    if(!r.ok)return[];return parse(await r.text(),date);
  }catch{return[]}
}
export default async(req)=>{
  const u=new URL(req.url),year=Math.max(2000,Math.min(new Date().getFullYear(),Number(u.searchParams.get("year"))||new Date().getFullYear()));
  const dates=saturdays(year), all=[];
  for(let i=0;i<dates.length;i+=8){
    const chunks=await Promise.all(dates.slice(i,i+8).map(week));chunks.forEach(x=>all.push(...x));
  }
  const map=new Map();
  for(const t of all){
    const k=(t.title+"|"+t.artist).toLowerCase();
    const old=map.get(k);
    if(!old)map.set(k,{...t,best:t.position,weeksTop3:1});
    else{old.best=Math.min(old.best,t.position);old.weeksTop3++;if(t.date>old.date)old.date=t.date;}
  }
  const tracks=[...map.values()].sort((a,b)=>a.best-b.best||b.weeksTop3-a.weeksTop3||b.date.localeCompare(a.date));
  return new Response(JSON.stringify({version:"16.7",year,source:"Ultratop Vlaanderen Singles Top 50",rule:"Every unique single that appeared at position 1, 2 or 3 in a weekly chart",count:tracks.length,tracks}),{headers:{"content-type":"application/json","cache-control":"public,max-age=86400"}});
};