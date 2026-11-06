export const releases = [
  {
    "id": "education-2026-11-06",
    "date": "2026-11-06",
    "symbol": "MSFT",
    "definition": {
      "schema": "elixir-quant-strategy",
      "version": 1,
      "name": "MSFT · 50-session price trend",
      "description": "Buy above the 50-session SMA; sell at or below it.",
      "entry": {
        "match": "all",
        "rules": [
          {
            "left": {
              "type": "close"
            },
            "operator": "gt",
            "right": {
              "type": "sma",
              "period": 50
            }
          }
        ]
      },
      "exit": {
        "match": "all",
        "rules": [
          {
            "left": {
              "type": "close"
            },
            "operator": "lte",
            "right": {
              "type": "sma",
              "period": 50
            }
          }
        ]
      }
    }
  }
];
