function decode(s=""){return s.replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;|&#x27;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();}
function move(p,lw){if(!lw)return{change:null,direction:"NEW",movement:"NEW"};const c=lw-p;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function parse(html){
 const start=html.search(/Single Top 100/i),end=html.search(/Album Top 100/i),part=html.slice(start>=0?start:0,end>start?end:html.length),tracks=[];
 const rows=[...part.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
 for(const r of rows){const cells=[...r[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>decode(x[1]));if(cells.length<4)continue;
  const p=Number((cells[0].match(/\d+/)||[])[0]);if(!p||p>100)continue;
  const lwRaw=cells[1]||"",lw=/^\s*\d+\s*$/.test(lwRaw)?Number(lwRaw):null;
  let title=cells[2]||"",artist=cells[3]||"";
  if(!title||!artist)continue;
  tracks.push({position:p,title,artist,lastWeek:lw,...move(p,lw)});if(tracks.length>=100)break;
 } return tracks;
}
export default async()=>{try{const r=await fetch("https://www.nvpi.nl/muziek/charts",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/10.1)",Accept:"text/html"}}),html=await r.text();if(!r.ok)throw new Error(`NVPI antwoordde met ${r.status}`);const tracks=parse(html);return Response.json({version:"10.1",country:"NL",source:"NVPI Single Top 100",success:tracks.length>0,count:tracks.length,tracks,diagnostics:tracks.length?null:{htmlLength:html.length,hasSingleTop100:/Single Top 100/i.test(html),trCount:(html.match(/<tr\b/gi)||[]).length,tdCount:(html.match(/<td\b/gi)||[]).length}},{headers:{"cache-control":"public, max-age=300, s-maxage=21600"}});}catch(e){return Response.json({version:"10.1",country:"NL",success:false,error:e.message,count:0,tracks:[]},{status:500});}};