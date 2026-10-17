$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$source='https://en.wikipedia.org/wiki/List_of_NASDAQ-100_companies'
$html=(Invoke-WebRequest -UseBasicParsing $source).Content
$table=[regex]::Match($html,'(?s)<table[^>]*id="constituents".*?</table>').Value
$companies=@(foreach($row in [regex]::Matches($table,'(?s)<tr\b[^>]*>(.*?)</tr>')){
 $cells=[regex]::Matches($row.Groups[1].Value,'(?s)<td\b[^>]*>(.*?)</td>')
 if($cells.Count -ge 2){
  $ticker=([regex]::Replace($cells[0].Groups[1].Value,'<[^>]+>','')).Trim()
  $name=[System.Net.WebUtility]::HtmlDecode(([regex]::Replace($cells[1].Groups[1].Value,'<[^>]+>','')).Trim())
  if($ticker -match '^[A-Z][A-Z.-]{0,7}$'){@{symbol=$ticker;name=$name}}
 }
})
if($companies.Count -lt 95 -or $companies.Count -gt 110){throw 'Unexpected constituent table; inspect source before updating.'}
$stocks=@{};$unavailable=@();$index=0
$period1=[DateTimeOffset]::Parse('2021-01-01T00:00:00Z').ToUnixTimeSeconds()
$period2=[DateTimeOffset]::Parse('2026-10-17T00:00:00Z').ToUnixTimeSeconds()
foreach($company in $companies){
 $symbol=$company.symbol
 try {
  $url="https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d&includeAdjustedClose=true"
  $response=Invoke-RestMethod -TimeoutSec 35 $url
  $r=$response.chart.result[0]
  if($r.meta.symbol -ne $symbol -or $r.meta.currency -ne 'USD'){throw 'Symbol/currency identity mismatch'}
  $adjusted=$r.indicators.adjclose[0].adjclose;$quote=$r.indicators.quote[0]
  if(!$adjusted -or $adjusted.Count -ne $r.timestamp.Count){throw 'Adjusted-close coverage missing'}
  $rows=@();$missing=0
  for($i=0;$i -lt $r.timestamp.Count;$i++){
   $date=[DateTimeOffset]::FromUnixTimeSeconds($r.timestamp[$i]).ToString('yyyy-MM-dd')
   if($date -gt '2026-10-16'){continue}
   if($null -eq $adjusted[$i] -or $adjusted[$i] -le 0 -or $null -eq $quote.close[$i]){$missing++;continue}
   $rows+=,@($date,[Math]::Round($adjusted[$i],6),[Math]::Round($quote.close[$i],6),$quote.volume[$i])
  }
  if($rows.Count -lt 61){throw 'Insufficient historical coverage'}
  if(@($rows | ForEach-Object {$_[0]} | Select-Object -Unique).Count -ne $rows.Count){throw 'Duplicate dates'}
  $stocks[$symbol]=@{name=$company.name;currency=$r.meta.currency;exchange=$r.meta.exchangeName;sourceUrl=$url;firstDate=$rows[0][0];lastDate=$rows[-1][0];missingRows=$missing;rows=$rows}
 } catch {$unavailable+=@{symbol=$symbol;name=$company.name;reason=$_.Exception.Message};Write-Output "Unavailable: $symbol"}
 $index++;if($index%10 -eq 0){Write-Output "Fetched $index / $($companies.Count)"}
 Start-Sleep -Milliseconds 150
}
if(!$stocks.ContainsKey('AAPL') -or !$stocks.ContainsKey('MSFT')){throw 'Core example data missing; preserve existing snapshot.'}
$snapshot=@{schema='elixir-quant-history';version=1;asOf='2026-10-17';lastCompletedDate='2026-10-16';requestedStart='2021-01-01';requestedEnd='2026-10-16';constituentSource=$source;constituents=$companies;priceSource='Yahoo Finance chart API';priceField='Provider adjusted close (split/dividend adjusted)';stocks=$stocks;unavailable=$unavailable;limitations=@('Static current-constituent snapshot, not historical index membership; survivorship bias.','Adjusted-close model is not a reconstruction of raw share fills or corporate-action cash flows.','Missing rows are omitted, never interpolated; per-symbol coverage is shown.','No real-time data; snapshot must be rebuilt to refresh.')}
$snapshot | ConvertTo-Json -Depth 12 -Compress | Set-Content -Encoding utf8 (Join-Path $root 'historical-data.json')
Write-Output "Saved $($stocks.Count) stocks; $($unavailable.Count) unavailable."
