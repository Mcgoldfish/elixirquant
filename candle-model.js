// Rows: date, open, high, low, close, volume. Never infer missing candles.
export function candleRows(rows,{start='',end='9999-12-31',interval='daily'}={}){
 if(!['daily','weekly','monthly'].includes(interval))throw Error('Unsupported candle interval.');
 if(start>end)throw Error('Start date must be on or before end date.');
 const selected=rows.filter(r=>r[0]>=start&&r[0]<=end);
 if(interval==='daily')return selected.map(r=>[...r]);
 const groups=new Map();for(const row of selected){const day=new Date(row[0]+'T00:00:00Z');day.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7);const key=interval==='weekly'?day.toISOString().slice(0,10):row[0].slice(0,7);const group=groups.get(key);if(group){group[2]=Math.max(group[2],row[2]);group[3]=Math.min(group[3],row[3]);group[4]=row[4];group[5]+=row[5];}else groups.set(key,[...row]);}return [...groups.values()];
}
