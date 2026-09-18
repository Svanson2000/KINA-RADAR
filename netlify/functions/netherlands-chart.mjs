function clean(s=""){return String(s).replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;|&#x27;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();}
function move(p,lw){if(!lw)return{change:null,direction:"NEW",movement:"NEW"};const c=lw-p;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function parse(html){
 const s=html.search(/Single Top 100/i),e=html.search(/Album Top 100/i),part=html.slice(s>=0?s:0,e>s?e:html.length),tracks=[];
 const rows=part.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[];
 for(const row of rows){
   const cells=(row.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi)||[]).map(clean);
   if(cells.length<4)continue;
   const nums=(cells[0].match(/\d+/g)||[]).map(Number),p=nums[0]; if(!p||p>100)continue;
   const lw=nums.length>1?nums[1]:null;
   const artist=cells[cells.length-2],label=cells[cells.length-1];
   let combined=cells[cells.length-3]||"",title=combined;
   if(artist&&combined.endsWith(artist+" "+label))title=combined.slice(0,-(artist+" "+label).length).trim();
   else if(artist&&combined.endsWith(artist))title=combined.slice(0,-artist.length).trim();
   if(!title||!artist)continue;
   tracks.push({position:p,title,artist,lastWeek:lw,...move(p,lw)});if(tracks.length>=100)break;
 }
 return tracks;
}
export default async()=>{try{const r=await fetch("https://www.nvpi.nl/muziek/charts",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/10.3)",Accept:"text/html"}}),html=await r.text();if(!r.ok)throw new Error(`NVPI antwoordde met ${r.status}`);const tracks=parse(html);return Response.json({version:"10.3",country:"NL",source:"NVPI Single Top 100",success:tracks.length>0,count:tracks.length,tracks,diagnostics:tracks.length?null:{htmlLength:html.length,trCount:(html.match(/<tr\b/gi)||[]).length}},{headers:{"cache-control":"public, max-age=300, s-maxage=21600"}});}catch(e){return Response.json({version:"10.3",country:"NL",success:false,error:e.message,count:0,tracks:[]},{status:500});}};