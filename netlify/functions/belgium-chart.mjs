const FEED="https://rss.marketingtools.apple.com/api/v2/be/music/most-played/50/songs.json";
function move(){return{lastWeek:null,change:null,direction:"CHART",movement:"•"};}
export default async()=>{try{
 const r=await fetch(FEED,{headers:{"User-Agent":"KINARadar/11.6","Accept":"application/json"}});
 if(!r.ok)throw new Error(`Apple Music Belgium antwoordde met ${r.status}`);
 const d=await r.json(),items=d?.feed?.results||[];
 const tracks=items.slice(0,50).map((x,i)=>({position:i+1,title:x.name||"",artist:x.artistName||"",image:x.artworkUrl100||null,url:x.url||null,...move()})).filter(x=>x.title&&x.artist);
 return Response.json({version:"11.6",country:"BE",source:"Apple Music Belgium Top Songs",success:tracks.length>0,count:tracks.length,tracks,error:tracks.length?null:"Geen Belgische tracks ontvangen"},{headers:{"cache-control":"public, max-age=300, s-maxage=3600"}});
}catch(e){return Response.json({version:"11.6",country:"BE",source:"Apple Music Belgium Top Songs",success:false,error:e.message,count:0,tracks:[]},{status:500,headers:{"cache-control":"no-store"}});}};