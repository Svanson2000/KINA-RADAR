function clean(s=""){return s.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/\s+/g," ").trim();}
function move(position,lastWeek){if(!lastWeek)return{change:null,direction:"NEW",movement:"NEW"};const c=lastWeek-position;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function parse(html){
  const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]),tracks=[];
  for(const row of rows){
    const cells=[...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
    if(cells.length<3)continue;
    const position=Number(cells[0]); if(!position||position>100)continue;
    const lastWeek=/^\d+$/.test(cells[1]||"")?Number(cells[1]):null;
    const text=cells.slice(2).filter(Boolean);
    if(text.length<2)continue;
    let title=text[0],artist=text[1];
    if(title===artist&&text.length>2)artist=text[2];
    tracks.push({position,title,artist,lastWeek,...move(position,lastWeek)});
    if(tracks.length>=50)break;
  }
  return tracks;
}
export default async()=>{
  try{
    const response=await fetch("https://www.nvpi.nl/muziek/charts",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/10.0)",Accept:"text/html"}});
    const html=await response.text();
    if(!response.ok)throw new Error(`NVPI antwoordde met ${response.status}`);
    const tracks=parse(html);
    return Response.json({version:"10.0",country:"NL",source:"NVPI Single Top 100",success:tracks.length>0,count:tracks.length,tracks,diagnostics:tracks.length?null:{htmlLength:html.length,hasSingleTop100:/Single Top 100/i.test(html)}},{headers:{"cache-control":"public, max-age=300, s-maxage=21600"}});
  }catch(error){return Response.json({version:"10.0",country:"NL",source:"NVPI Single Top 100",success:false,error:error.message,count:0,tracks:[]},{status:500,headers:{"cache-control":"no-store"}});}
};