function clean(s=""){return String(s).replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;|&#x27;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();}
function move(p,lw){if(!lw)return{change:null,direction:"NEW",movement:"NEW"};const c=lw-p;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function parse(html){
 const s=html.search(/>Single Top 100</i),e=html.search(/>Album Top 100</i),part=html.slice(s>=0?s:0,e>s?e:html.length),tracks=[];
 const rows=part.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[];
 for(const row of rows){
  const cells=(row.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi)||[]).map(clean);
  const rowText=clean(row),lead=rowText.match(/^\s*(\d{1,3})\s+(-|\d{1,3})\s+/);if(!lead)continue;
  const p=Number(lead[1]);if(!p||p>100)continue;const lw=lead[2]==="-"?null:Number(lead[2]);
  let artist="",title="";
  if(cells.length>=2){
   const meaningful=cells.filter(x=>x&&x!==String(p)&&x!==String(lw||"-"));
   if(meaningful.length>=3){artist=meaningful[meaningful.length-2];const combined=meaningful[meaningful.length-3];title=combined;if(artist&&combined.includes(artist))title=combined.slice(0,combined.lastIndexOf(artist)).trim();}
  }
  if(!title||!artist){const rest=rowText.slice(lead[0].length).trim();const links=[...row.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(x=>clean(x[1])).filter(Boolean);if(links.length>=2){title=links[0];artist=links[1];}else continue;}
  if(title.length>200||artist.length>200)continue;
  tracks.push({position:p,title,artist,lastWeek:lw,...move(p,lw)});if(tracks.length>=100)break;
 }return tracks;
}
export default async()=>{try{const r=await fetch("https://www.nvpi.nl/muziek/charts",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/10.4)",Accept:"text/html"}}),html=await r.text();if(!r.ok)throw new Error(`NVPI antwoordde met ${r.status}`);const tracks=parse(html);return Response.json({version:"10.4",country:"NL",source:"NVPI Single Top 100",success:tracks.length>0,count:tracks.length,tracks,diagnostics:tracks.length?null:{htmlLength:html.length,trCount:(html.match(/<tr\b/gi)||[]).length}},{headers:{"cache-control":"public, max-age=300, s-maxage=21600"}});}catch(e){return Response.json({version:"10.4",country:"NL",success:false,error:e.message,count:0,tracks:[]},{status:500});}};