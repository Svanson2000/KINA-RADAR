function clean(s=""){return String(s).replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;|&#x27;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();}
function num(s){const m=String(s||"").match(/\d+/);return m?Number(m[0]):null;}
function move(p,lw){if(!lw)return{change:null,direction:"NEW",movement:"NEW"};const c=lw-p;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function extract(block,name){const at=block.indexOf(name);if(at<0)return"";const gt=block.indexOf(">",at);if(gt<0)return"";const end=block.indexOf("</",gt);return end<0?"":clean(block.slice(gt+1,end));}
function parse(html){
 const names=[];let pos=0;
 while((pos=html.indexOf("chart-name",pos))>=0){names.push(pos);pos+=10;}
 const tracks=[];
 for(let i=0;i<names.length&&tracks.length<50;i++){
   const start=Math.max(0,names[i]-5000),end=names[i+1]||Math.min(html.length,names[i]+12000),block=html.slice(start,end);
   const title=extract(block.slice(names[i]-start),"chart-name"),artist=extract(block.slice(names[i]-start),"chart-artist");if(!title||!artist)continue;
   const before=html.slice(Math.max(0,names[i]-5000),names[i]),pm=[...before.matchAll(/Number\s+(\d{1,3})/gi)].pop(),p=pm?Number(pm[1]):tracks.length+1;
   const lm=block.match(/title="Last week"[^>]*>([\s\S]*?)<\//i),lw=num(lm?clean(lm[1]):"");
   tracks.push({position:p,title,artist,lastWeek:lw,peak:num(extract(block,"peak")),weeks:num(extract(block,"weeks")),...move(p,lw)});
 }
 return tracks;
}
export default async()=>{try{const r=await fetch("https://www.officialcharts.com/charts/french-singles-chart/",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/10.3)",Accept:"text/html"}}),html=await r.text();if(!r.ok)throw new Error(`Official Charts antwoordde met ${r.status}`);const tracks=parse(html);return Response.json({version:"10.3",country:"FR",source:"Official Charts / French Singles",success:tracks.length>0,count:tracks.length,tracks,diagnostics:tracks.length?null:{htmlLength:html.length,chartNames:(html.match(/chart-name/gi)||[]).length}},{headers:{"cache-control":"public, max-age=300, s-maxage=21600"}});}catch(e){return Response.json({version:"10.3",country:"FR",success:false,error:e.message,count:0,tracks:[]},{status:500});}};