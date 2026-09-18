function clean(s=""){return String(s).replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;/gi,"'").replace(/&#x27;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();}
function num(s){const m=String(s||"").match(/\d+/);return m?Number(m[0]):null;}
function move(p,lw){if(!lw)return{change:null,direction:"NEW",movement:"NEW"};const c=lw-p;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function classText(block,className){
  const needle=className;let pos=block.indexOf(needle);
  while(pos>=0){
    const open=block.lastIndexOf("<",pos),gt=block.indexOf(">",pos);
    if(open>=0&&gt>=0){
      const close=block.indexOf("</",gt);
      if(close>=0)return clean(block.slice(gt+1,close));
    }
    pos=block.indexOf(needle,pos+needle.length);
  }
  return "";
}
function parse(html){
  const tracks=[];const re=/Number\s+(\d{1,3})/gi;const marks=[];let m;
  while((m=re.exec(html))!==null)marks.push({position:Number(m[1]),index:m.index});
  for(let i=0;i<marks.length&&tracks.length<50;i++){
    const mark=marks[i];if(!mark.position||mark.position>100)continue;
    const end=marks[i+1]?marks[i+1].index:Math.min(html.length,mark.index+20000);
    const block=html.slice(mark.index,end);
    const title=classText(block,"chart-name"),artist=classText(block,"chart-artist");
    if(!title||!artist)continue;
    const lastMatch=block.match(/title="Last week"[^>]*>([\s\S]*?)<\//i);
    const lw=num(lastMatch?clean(lastMatch[1]):"");
    tracks.push({position:mark.position,title,artist,lastWeek:lw,peak:num(classText(block,"peak")),weeks:num(classText(block,"weeks")),...move(mark.position,lw)});
  }
  return tracks;
}
export default async()=>{
  try{
    const r=await fetch("https://www.officialcharts.com/charts/french-singles-chart/",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/10.2)",Accept:"text/html"}});
    const html=await r.text();if(!r.ok)throw new Error(`Official Charts antwoordde met ${r.status}`);
    const tracks=parse(html);
    return Response.json({version:"10.2",country:"FR",source:"Official Charts / French Singles",success:tracks.length>0,count:tracks.length,tracks,diagnostics:tracks.length?null:{htmlLength:html.length,numberMarkers:(html.match(/Number\s+\d+/gi)||[]).length,chartNames:(html.match(/chart-name/gi)||[]).length}},{headers:{"cache-control":"public, max-age=300, s-maxage=21600"}});
  }catch(e){return Response.json({version:"10.2",country:"FR",success:false,error:e.message,count:0,tracks:[]},{status:500});}
};