function clean(s=""){return s.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;|&#x27;/gi,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();}
function num(s){const m=String(s||"").match(/\d+/);return m?Number(m[0]):null;}
function move(position,lastWeek){if(!lastWeek)return{change:null,direction:"NEW",movement:"NEW"};const c=lastWeek-position;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function pick(block,cls){
  const marker='class="';
  let at=0;
  while((at=block.indexOf(marker,at))!==-1){
    const end=block.indexOf('"',at+marker.length);
    if(end===-1)break;
    const classes=block.slice(at+marker.length,end);
    if(classes.split(/\s+/).some(c=>c.includes(cls))){
      const gt=block.indexOf(">",end),lt=block.indexOf("</",gt);
      if(gt!==-1&&lt!==-1)return clean(block.slice(gt+1,lt));
    }
    at=end+1;
  }
  return "";
}
function parse(html){
  const marker="chart-item",tracks=[];let cursor=0;
  while(tracks.length<50){
    const hit=html.indexOf(marker,cursor);if(hit===-1)break;
    const next=html.indexOf(marker,hit+marker.length);
    const block=html.slice(hit,next===-1?Math.min(html.length,hit+15000):next);
    const title=pick(block,"chart-name"),artist=pick(block,"chart-artist");
    if(title&&artist){
      const pm=block.match(/Number\s+(\d{1,3})/i);
      const lm=block.match(/title=["']Last week["'][^>]*>([\s\S]*?)<\//i);
      const position=num(pm&&pm[1])||tracks.length+1;
      const lastWeek=num(lm&&lm[1]);
      tracks.push({position,title,artist,lastWeek,peak:num(pick(block,"peak")),weeks:num(pick(block,"weeks")),...move(position,lastWeek)});
    }
    cursor=next===-1?html.length:next;
  }
  return tracks;
}
export default async()=>{
  try{
    const response=await fetch("https://www.officialcharts.com/charts/french-singles-chart/",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/10.0)",Accept:"text/html"}});
    const html=await response.text();
    if(!response.ok)throw new Error(`Official Charts antwoordde met ${response.status}`);
    const tracks=parse(html);
    return Response.json({version:"10.0",country:"FR",source:"Official Charts / French Singles",success:tracks.length>0,count:tracks.length,tracks,diagnostics:tracks.length?null:{htmlLength:html.length,chartItems:(html.match(/chart-item/gi)||[]).length,chartNames:(html.match(/chart-name/gi)||[]).length}},{headers:{"cache-control":"public, max-age=300, s-maxage=21600"}});
  }catch(error){return Response.json({version:"10.0",country:"FR",source:"Official Charts / French Singles",success:false,error:error.message,count:0,tracks:[]},{status:500,headers:{"cache-control":"no-store"}});}
};