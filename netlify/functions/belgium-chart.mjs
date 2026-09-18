const URL="https://music.apple.com/be/playlist/singles-vlaanderen/pl.99c5f23a735045308123a2cbd46d1c2a";
function text(v){return String(v??"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();}
function artistOf(x){const a=x?.byArtist||x?.artist||x?.artists;if(typeof a==="string")return a;if(Array.isArray(a))return a.map(v=>v?.name||v).filter(Boolean).join(", ");return a?.name||x?.artistName||"";}
function collect(node,out,seen){if(!node||typeof node!=="object")return;if(Array.isArray(node)){for(const v of node)collect(v,out,seen);return;}
 const type=String(node["@type"]||node.type||"").toLowerCase(),title=node.name||node.title,artist=artistOf(node);
 if(title&&artist&&(type.includes("musicrecording")||type==="song"||node.duration||node.audio)){
  const k=(title+"|"+artist).toLowerCase();if(!seen.has(k)){seen.add(k);out.push({title:text(title),artist:text(artist),image:Array.isArray(node.image)?node.image[0]:node.image||null,url:node.url||null});}
 }
 for(const [k,v] of Object.entries(node)){if(!["image","audio"].includes(k))collect(v,out,seen);}
}
function parse(html){const tracks=[],seen=new Set();for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{collect(JSON.parse(m[1]),tracks,seen)}catch{}}
 if(!tracks.length){for(const m of html.matchAll(/"name"\s*:\s*"([^"]+)"[\s\S]{0,1200}?"artistName"\s*:\s*"([^"]+)"/g)){const k=(m[1]+"|"+m[2]).toLowerCase();if(!seen.has(k)){seen.add(k);tracks.push({title:text(m[1]),artist:text(m[2]),image:null,url:null});}if(tracks.length>=50)break;}}
 return tracks.slice(0,50).map((t,i)=>({position:i+1,...t,lastWeek:null,change:null,direction:"PLAYLIST",movement:"•"}));
}
export default async()=>{try{const r=await fetch(URL,{headers:{"User-Agent":"Mozilla/5.0 (compatible; KINARadar/11.5)",Accept:"text/html"}}),html=await r.text();if(!r.ok)throw new Error(`Apple Music antwoordde met ${r.status}`);const tracks=parse(html);return Response.json({version:"11.5",country:"BE",source:"Ultratop Singles Vlaanderen via official Apple Music curator",success:tracks.length>0,count:tracks.length,tracks,error:tracks.length?null:"Geen tracks gevonden in Ultratop Apple Music playlist"},{headers:{"cache-control":"public, max-age=300, s-maxage=3600"}});}catch(e){return Response.json({version:"11.5",country:"BE",source:"Ultratop Singles Vlaanderen via official Apple Music curator",success:false,error:e.message,count:0,tracks:[]},{status:500});}};