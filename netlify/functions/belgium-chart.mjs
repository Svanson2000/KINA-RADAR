function clean(s=""){return s.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/\s+/g," ").trim();}
function move(position,lastWeek){if(!lastWeek)return{change:null,direction:"NEW",movement:"NEW"};const c=lastWeek-position;return{change:c,direction:c>0?"UP":c<0?"DOWN":"SAME",movement:c>0?`+${c}`:String(c)};}
function parse(html){
  const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]),tracks=[];
  for(const row of rows){
    const cells=[...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
    if(cells.length<6)continue;
    const position=Number(cells[0]); if(!position||position>100)continue;
    const lastWeek=Number(cells[1])||null, weeks=Number(cells[2])||null;
    const artist=cells[3], title=cells[4], peak=Number(cells[cells.length-1])||null;
    if(!artist||!title)continue;
    tracks.push({position,title,artist,lastWeek,weeks,peak,...move(position,lastWeek)});
    if(tracks.length>=50)break;
  }
  return tracks;
}
export default async()=>{
  try{
    const response=await fetch("https://www.ultratop.be/print.asp?cat=s&lang=nl",{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/10.0)",Accept:"text/html"}});
    const html=await response.text();
    if(!response.ok)throw new Error(`Ultratop antwoordde met ${response.status}`);
    const tracks=parse(html);
    return Response.json({version:"10.0",country:"BE",source:"Ultratop Vlaanderen Singles",success:tracks.length>0,count:tracks.length,tracks,diagnostics:tracks.length?null:{htmlLength:html.length,hasTable:/<table/i.test(html)}},{headers:{"cache-control":"public, max-age=300, s-maxage=21600"}});
  }catch(error){return Response.json({version:"10.0",country:"BE",source:"Ultratop Vlaanderen Singles",success:false,error:error.message,count:0,tracks:[]},{status:500,headers:{"cache-control":"no-store"}});}
};