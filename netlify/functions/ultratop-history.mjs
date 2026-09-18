const H={"User-Agent":"Mozilla/5.0 KINA-RADAR/16.9","Accept":"text/html"};
const clean=s=>String(s||"").replace(/&amp;/g,"&").replace(/&#39;|&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g," ").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
function parse(html,year){
  const text=clean(html), out=[];
  const re=/(\d+)\.\s*\([^)]*\)\s*\d*\s*(.{1,160}?)\s+peak position:\s*([1-9]\d*)\s*[–-]\s*total weeks:/gi; let m;
  while((m=re.exec(text))){
    const peak=+m[3]; if(peak>3)continue;
    let titleArtist=clean(m[2]).replace(/\s+(Greatest Gain|Highest Debut|Longest on Chart).*$/i,"");
    // HTML links give a safer title when available; text fallback remains.
    const chunk=html.slice(Math.max(0,m.index-1500),Math.min(html.length,m.index+3500));
    const links=[...chunk.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)].map(x=>clean(x[1])).filter(x=>x&&x.length<140);
    let title=links.find(x=>titleArtist.toLowerCase().startsWith(x.toLowerCase()))||"";
    let artist=title?titleArtist.slice(title.length).trim():titleArtist;
    if(!title){const cut=titleArtist.match(/^(.+?)\s{2,}(.+)$/);if(cut){title=cut[1];artist=cut[2]}else title=titleArtist}
    if(title)out.push({title,artist,peak,year});
  }
  return out;
}
async function yearList(year){
  const slug=year===new Date().getFullYear()?"currentyear":String(year);
  try{const r=await fetch("https://acharts.co/belgium_singles_top_50/"+slug,{headers:H});if(!r.ok)return[];return parse(await r.text(),year)}catch{return[]}
}
export default async()=>{
  const now=new Date().getFullYear(), parts=await Promise.all(Array.from({length:now-2019},(_,i)=>yearList(2020+i)));
  const map=new Map();
  parts.flat().forEach(t=>{const k=(t.title+"|"+t.artist).toLowerCase();const o=map.get(k);if(!o)map.set(k,{...t,years:[t.year]});else{o.peak=Math.min(o.peak,t.peak);if(!o.years.includes(t.year))o.years.push(t.year)}});
  const tracks=[...map.values()].sort((a,b)=>b.year-a.year||a.peak-b.peak||a.title.localeCompare(b.title));
  return new Response(JSON.stringify({version:"16.9",source:"Belgium Singles Top 50, compiled by Ultratop via Acharts yearly archive",rule:"All unique singles with peak position 1, 2 or 3 from 2020 through current year",count:tracks.length,tracks}),{headers:{"content-type":"application/json","cache-control":"public,max-age=86400"}});
};