function clean(s=""){return String(s).replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;|&#x27;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();}
function move(p,lw){if(!lw)return{change:null,direction:"NEW",movement:"NEW"};const c=lw-p;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function parse(html){
 const tracks=[];
 const itemRe=/<div class="(?:primis )?chart-item relative text-right"[\s\S]*?(?=<div class="(?:primis )?chart-item relative text-right"|<div class="chart-item chart-ad|$)/gi;
 for(const m of html.matchAll(itemRe)){
  const b=m[0];
  const p=(b.match(/class="[^"]*chart-key[^"]*"[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/i)||[])[1];
  const title=(b.match(/class="chart-name[^"]*"[^>]*>[\s\S]*?<span(?: class="movement-icon[^"]*")?><\/span>\s*<span>([^<]+)<\/span>/i)||[])[1]||(b.match(/class="chart-name[^"]*"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/i)||[])[1];
  const artist=(b.match(/class="chart-artist[^"]*"[^>]*>\s*<span>([^<]+)<\/span>/i)||[])[1];
  if(!p||!title||!artist)continue;
  const lw=(b.match(/title="Last week"[^>]*>[\s\S]*?<span[^>]*>(\d+)<\/span>/i)||[])[1];
  const peak=(b.match(/class="peak[^"]*"[^>]*>[\s\S]*?<span[^>]*>(\d+)<\/span>/i)||[])[1];
  const weeks=(b.match(/class="weeks[^"]*"[^>]*>[\s\S]*?<span[^>]*>(\d+)<\/span>/i)||[])[1];
  const img=(b.match(/class="chart-image-small[^"]*"[^>]*src="([^"]+)"/i)||[])[1]||null;
  const pos=Number(p),last=lw?Number(lw):null;
  tracks.push({position:pos,title:clean(title),artist:clean(artist),lastWeek:last,peak:peak?Number(peak):null,weeks:weeks?Number(weeks):null,image:img,...move(pos,last)});
  if(tracks.length>=50)break;
 }
 return tracks;
}
export default async()=>{try{
 const r=await fetch("https://www.officialcharts.com/charts/french-singles-chart/",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/11.4)",Accept:"text/html"}});
 const html=await r.text();if(!r.ok)throw new Error(`Official Charts antwoordde met ${r.status}`);
 const tracks=parse(html);
 return Response.json({version:"11.4",country:"FR",source:"Official Charts / French Singles",success:tracks.length>0,count:tracks.length,tracks},{headers:{"cache-control":"public, max-age=60, s-maxage=1800"}});
}catch(e){return Response.json({version:"11.4",country:"FR",success:false,error:e.message,count:0,tracks:[]},{status:500});}};