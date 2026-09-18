function clip(html,needle,before=700,after=2500){const i=html.toLowerCase().indexOf(needle.toLowerCase());if(i<0)return null;return html.slice(Math.max(0,i-before),Math.min(html.length,i+after));}
export default async()=>{
 const headers={"User-Agent":"Mozilla/5.0 (compatible; KINARadar-Debug/1.0)",Accept:"text/html"};
 const [nlr,frr]=await Promise.all([fetch("https://www.nvpi.nl/muziek/charts",{headers}),fetch("https://www.officialcharts.com/charts/french-singles-chart/",{headers})]);
 const [nl,fr]=await Promise.all([nlr.text(),frr.text()]);
 return Response.json({
  version:"debug-1",
  nl:{status:nlr.status,length:nl.length,singleTop100:clip(nl,"Single Top 100",300,5000),firstTrAfterChart:(()=>{const s=nl.toLowerCase().indexOf("single top 100");const x=s>=0?nl.indexOf("<tr",s):-1;return x>=0?nl.slice(x,Math.min(nl.length,x+5000)):null;})()},
  fr:{status:frr.status,length:fr.length,firstChartName:clip(fr,'class="chart-name',1800,5000)}
 },{headers:{"cache-control":"no-store","content-type":"application/json; charset=utf-8"}});
};