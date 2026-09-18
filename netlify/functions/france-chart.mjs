function clean(s=""){return String(s).replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;|&#x27;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();}
function move(p,lw){if(!lw)return{change:null,direction:"NEW",movement:"NEW"};const c=lw-p;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function inner(block,cls){const re=new RegExp('<[^>]*class="[^"]*'+cls+'[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>','i'),m=block.match(re);return m?clean(m[1]):"";}
function parse(html){
 const blocks=html.split(/(?=<div class="(?:primis )?chart-item relative text-right")/i),tracks=[];
 for(const block of blocks){
  const pm=block.match(/<span class="sr-only">Number <\/span><strong>(\d+)<\/strong>/i);if(!pm)continue;
  const p=Number(pm[1]),title=inner(block,"chart-name"),artist=inner(block,"chart-artist");if(!title||!artist)continue;
  const lwM=block.match(/title="Last week">LW:\s*<span[^>]*>([^<]+)<\/span>/i),peakM=block.match(/class="peak[^"]*"[^>]*>Peak:\s*<span[^>]*>([^<]+)<\/span>/i),weeksM=block.match(/class="weeks[^"]*"[^>]*>Weeks:\s*<span[^>]*>([^<]+)<\/span>/i);
  const lw=lwM?Number(lwM[1])||null:null,img=(block.match(/class="chart-image-small[^"]*"[^>]*src="([^"]+)"/i)||[])[1]||null;
  tracks.push({position:p,title,artist,lastWeek:lw,peak:peakM?Number(peakM[1])||null:null,weeks:weeksM?Number(weeksM[1])||null:null,image:img,...move(p,lw)});if(tracks.length>=50)break;
 }return tracks;
}
export default async()=>{try{const r=await fetch("https://www.officialcharts.com/charts/french-singles-chart/",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/11.0)",Accept:"text/html"}}),html=await r.text();if(!r.ok)throw new Error(`Official Charts antwoordde met ${r.status}`);const tracks=parse(html);return Response.json({version:"11.0",country:"FR",source:"Official Charts / French Singles",success:tracks.length>0,count:tracks.length,tracks},{headers:{"cache-control":"public, max-age=300, s-maxage=21600"}});}catch(e){return Response.json({version:"11.0",country:"FR",success:false,error:e.message,count:0,tracks:[]},{status:500});}};