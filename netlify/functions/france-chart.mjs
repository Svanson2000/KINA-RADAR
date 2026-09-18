function clean(s=""){return String(s).replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;|&#x27;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();}
function num(s){const m=String(s||"").match(/\d+/);return m?Number(m[0]):null;}
function move(p,lw){if(!lw)return{change:null,direction:"NEW",movement:"NEW"};const c=lw-p;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function tagText(block,cls){
 const re=cls==="chart-name"?/<[^>]+class="[^"]*chart-name[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i:/<[^>]+class="[^"]*chart-artist[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i;
 const m=block.match(re);return m?clean(m[1]):"";
}
function parse(html){
 const starts=[];const re=/<[^>]+class="[^"]*chart-name[^"]*"[^>]*>/gi;let m;
 while((m=re.exec(html))!==null)starts.push(m.index);
 const tracks=[];
 for(let i=0;i<starts.length&&tracks.length<50;i++){
  const start=Math.max(0,starts[i]-6000),end=starts[i+1]||Math.min(html.length,starts[i]+12000),block=html.slice(start,end);
  const title=tagText(block,"chart-name"),artist=tagText(block,"chart-artist");if(!title||!artist||title.length>150||artist.length>200)continue;
  const before=html.slice(Math.max(0,starts[i]-6000),starts[i]),positions=[...before.matchAll(/Number\s+(\d{1,3})/gi)],p=positions.length?Number(positions[positions.length-1][1]):tracks.length+1;
  const lwM=block.match(/title="Last week"[^>]*>([\s\S]*?)<\//i),lw=num(lwM?clean(lwM[1]):"");
  const peakM=block.match(/class="[^"]*peak[^"]*"[^>]*>([\s\S]*?)<\//i),weeksM=block.match(/class="[^"]*weeks[^"]*"[^>]*>([\s\S]*?)<\//i);
  tracks.push({position:p,title,artist,lastWeek:lw,peak:num(peakM?clean(peakM[1]):""),weeks:num(weeksM?clean(weeksM[1]):""),...move(p,lw)});
 }return tracks;
}
export default async()=>{try{const r=await fetch("https://www.officialcharts.com/charts/french-singles-chart/",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/10.4)",Accept:"text/html"}}),html=await r.text();if(!r.ok)throw new Error(`Official Charts antwoordde met ${r.status}`);const tracks=parse(html);return Response.json({version:"10.4",country:"FR",source:"Official Charts / French Singles",success:tracks.length>0,count:tracks.length,tracks,diagnostics:tracks.length?null:{htmlLength:html.length,realChartNames:(html.match(/class="[^"]*chart-name[^"]*"/gi)||[]).length}},{headers:{"cache-control":"public, max-age=300, s-maxage=21600"}});}catch(e){return Response.json({version:"10.4",country:"FR",success:false,error:e.message,count:0,tracks:[]},{status:500});}};