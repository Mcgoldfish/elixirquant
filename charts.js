const active=new Map();
new MutationObserver(()=>{for(const [node,{chart,observer}] of active)if(!node.isConnected){observer.disconnect();chart.dispose();active.delete(node);}}).observe(document.documentElement,{childList:true,subtree:true});
export function drawChart(node,series,drawdown=false,{startSession=1,normalized=false,title='',dates=null,relative=false,unit=null}={}){
 const chartNode=document.createElement('div');chartNode.className='echart';chartNode.setAttribute('role','img');chartNode.setAttribute('aria-label',title|| (drawdown?'Interactive drawdown chart':'Interactive equity chart'));node.append(chartNode);
 if(!globalThis.echarts){chartNode.textContent='Chart module could not load. Reload the page; metrics and trade tables remain available.';return;}
 const chart=globalThis.echarts.init(chartNode,null,{renderer:'canvas'});
 const dateAxis=dates||(series.every(s=>s.dates)?[...new Set(series.flatMap(s=>s.dates))].sort():null);
 const labels=dateAxis||Array.from({length:Math.max(...series.map(s=>s.values.length))},(_,i)=>`${relative?'Relative session':'Session'} ${startSession+i}`);
 chart.setOption({backgroundColor:'transparent',animation:false,color:series.map(s=>s.color),aria:{enabled:true},title:{text:title,textStyle:{color:'#e0e9e3',fontSize:13},left:18,top:14},
  legend:{top:40,textStyle:{color:'#afc2b5'},data:series.map((s,i)=>s.name||`Run ${i+1}`)},
  tooltip:{trigger:'axis',renderMode:'richText',axisPointer:{type:'cross'},valueFormatter:v=>v===null?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:2})+(drawdown?'%':'')},
  toolbox:{right:18,top:10,iconStyle:{borderColor:'#9fb0a7'},feature:{dataZoom:{yAxisIndex:'none'},restore:{},saveAsImage:{name:'Elixir-Quant-chart',backgroundColor:'#050906'}}},
  grid:{left:85,right:30,top:90,bottom:85},
  xAxis:{type:'category',boundaryGap:false,data:labels,axisLabel:{color:'#9fb0a7',hideOverlap:true},axisLine:{lineStyle:{color:'#34483e'}}},
  yAxis:{type:'value',scale:true,name:unit||(drawdown?'Drawdown (%)':normalized?'Index (start = 100)':'Equity ($)'),nameTextStyle:{color:'#9fb0a7'},axisLabel:{color:'#9fb0a7'},splitLine:{lineStyle:{color:'#172b21'}}},
  dataZoom:[{type:'inside',filterMode:'none'},{type:'slider',bottom:20,height:22,borderColor:'#34483e',textStyle:{color:'#9fb0a7'},fillerColor:'#22c55e22',handleStyle:{color:'#22c55e'},filterMode:'none'}],
  series:series.map((s,i)=>{const byDate=s.dates?new Map(s.dates.map((d,j)=>[d,s.values[j]])):null;return {name:s.name||`Run ${i+1}`,type:'line',showSymbol:false,connectNulls:false,data:byDate?labels.map(d=>byDate.get(d)??null):s.values,lineStyle:{width:2,color:s.color},...(drawdown?{areaStyle:{opacity:0.12}}:{})};})});
 const observer=new ResizeObserver(()=>chart.resize());observer.observe(chartNode);active.set(chartNode,{chart,observer});
 const hint=document.createElement('p');hint.className='note';hint.textContent='Hover for values · Scroll or drag the slider to zoom · Click legend labels to toggle lines · Use the toolbar to reset or save an image.';node.append(hint);
}
