from core import get_fundamental_full
import json
r = get_fundamental_full('AAPL')
print('=== growth section ===')
for key in ['total_revenue', 'total_liabilities', 'total_cash', 'earnings_growth', 'revenue_growth']:
    print(f'{key}: {repr(r.get(key))}')
print(f'error: {repr(r.get("error"))}')