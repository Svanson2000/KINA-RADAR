function clean(s=""){return String(s).replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;|&#x27;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();}
function move(p,lw){if(!lw)return{change:null,direction:"NEW",movement:"NEW"};const c=lw-p;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function parse(html){const starts=[];const re=/<div class="(?:primis )?chart-item relative text-right"\b/gi;let m;while((m=re.exec(html))!==null)starts.push(m.index);const tracks=[];
 for(let i=0;i<starts.length&&tracks.length<50;i++){const block=html.slice(starts[i],starts[i+1]||html.length);
  const pM=block.match(/<span class="sr-only">Number <\/span><strong>(\d+)<\/strong>/i);
  const tM=block.match(/class="chart-name[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<\/a>/i);
  const aM=block.match(/class="chart-artist[^"]*"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i);
  if(!pM||!tM||!aM)continue;const p=Number(pM[1]),title=clean(tM[1]),artist=clean(aM[1]);
  const lwM=block.match(/title="Last week">LW:\s*<span[^>]*>(\d+)<\/span>/i),peakM=block.match(/>Peak:\s*<span[^>]*>(\d+)<\/span>/i),weeksM=block.match(/>Weeks:\s*<span[^>]*>(\d+)<\/span>/i),imgM=block.match(/class="chart-image-small[^"]*"\s+src="([^"]+)"/i);
  const lw=lwM?Number(lwM[1]):null;tracks.push({position:p,title,artist,lastWeek:lw,peak:peakM?Number(peakM[1]):null,weeks:weeksM?Number(weeksM[1]):null,image:imgM?imgM[1]:null,...move(p,lw)});
 }return tracks;}
export default async()=>{try{const r=await fetch("https://www.officialcharts.com/charts/french-singles-chart/",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/11.1)",Accept:"text/html"}}),html=await r.text();if(!r.ok)throw new Error(`Official Charts antwoordde met ${r.status}`);const tracks=parse(html);return Response.json({version:"11.1",country:"FR",source:"Official Charts / French Singles",success:tracks.length>0,count:tracks.length,tracks},{headers:{"cache-control":"public, max-age=300, s-maxage=21600"}});}catch(e){return Response.json({version:"11.1",country:"FR",success:false,error:e.message,count:0,tracks:[]},{status:500});}};