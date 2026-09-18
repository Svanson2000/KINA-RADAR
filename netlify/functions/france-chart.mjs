function clean(s=""){return s.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;|&#x27;/gi,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();}
function num(s){const m=String(s||"").match(/\d+/);return m?Number(m[0]):null;}
function move(position,lastWeek){if(!lastWeek)return{change:null,direction:"NEW",movement:"NEW"};const c=lastWeek-position;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function pick(block,cls){const r=new RegExp('class=["\\'][^"\\']*'+cls+'[^"\\']*["\\'][^>]*>([\\s\\S]*?)<\\/','i');const m=block.match(r);return m?clean(m[1]):"";}
function parse(html){
  const chunks=html.split(/(?=<[^>]+class=["'][^"']*chart-item[^"']*["'])/i),tracks=[];
  for(const block of chunks){
    if(!/chart-item/i.test(block))continue;
    let title=pick(block,"chart-name"),artist=pick(block,"chart-artist");
    if(!title||!artist)continue;
    const position=num((block.match(/Number\s+(\d{1,3})/i)||[])[1])||tracks.length+1;
    const lastWeek=num((block.match(/title=["']Last week["'][^>]*>([\s\S]*?)<\//i)||[])[1]);
    const peak=num(pick(block,"peak")),weeks=num(pick(block,"weeks"));
    tracks.push({position,title,artist,lastWeek,peak,weeks,...move(position,lastWeek)});
    if(tracks.length>=50)break;
  }
  return tracks;
}
export default async()=>{
  try{
    const response=await fetch("https://www.officialcharts.com/charts/french-singles-chart/",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/10.0)",Accept:"text/html"}});
    const html=await response.text();if(!response.ok)throw new Error(`Official Charts antwoordde met ${response.status}`);
    const tracks=parse(html);
    return Response.json({version:"10.0",country:"FR",source:"Official Charts / French Singles",success:tracks.length>0,count:tracks.length,tracks,diagnostics:tracks.length?null:{htmlLength:html.length,chartItems:(html.match(/chart-item/gi)||[]).length,chartNames:(html.match(/chart-name/gi)||[]).length}},{headers:{"cache-control":"public, max-age=300, s-maxage=21600"}});
  }catch(error){return Response.json({version:"10.0",country:"FR",source:"Official Charts / French Singles",success:false,error:error.message,count:0,tracks:[]},{status:500,headers:{"cache-control":"no-store"}});}
};