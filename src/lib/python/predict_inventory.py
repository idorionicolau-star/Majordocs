import sys
import json
import math
from datetime import datetime, timedelta

def calculate_predictions(data):
    products = data.get("products", [])
    movements = data.get("movements", [])
    sales = data.get("sales", [])
    
    # Configuration
    Z_SCORE = 1.65 # 90% service level
    WINDOW_DAYS = 30
    MIN_SALES_FOR_STATS = 3 # "Discovery Mode" threshold
    
    # 1. Map consumption per (productName, locationId)
    # We use a 30-day window
    consumption_history = {}
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    cutoff_date = today - timedelta(days=WINDOW_DAYS)
    
    # Helper to parse dates
    def parse_date(date_val):
        if not date_val: return None
        try:
            if isinstance(date_val, dict) and "seconds" in date_val:
                return datetime.utcfromtimestamp(date_val["seconds"])
            if isinstance(date_val, (int, float)):
                return datetime.utcfromtimestamp(date_val / 1000.0 if date_val > 1e11 else date_val)
            date_str = str(date_val).strip()
            if "T" in date_str:
                return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            return datetime.strptime(date_str[:10], "%Y-%m-%d")
        except:
            return None

    # Process Sales
    for sale in sales:
        pname = sale.get("productName", "Unknown").strip()
        loc = sale.get("location") or "Principal"
        qty = float(sale.get("quantity", 0))
        s_date = parse_date(sale.get("date"))
        
        if not s_date or s_date.replace(tzinfo=None) < cutoff_date:
            continue
            
        key = (pname, loc)
        day_str = s_date.strftime("%Y-%m-%d")
        if key not in consumption_history: consumption_history[key] = {}
        consumption_history[key][day_str] = consumption_history[key].get(day_str, 0) + qty

    # Process Movements (OUT only, avoiding doubles)
    for move in movements:
        if move.get("type") != "OUT": continue
        reason = move.get("reason", "")
        if "Venda" in reason or "Levantamento" in reason: continue
        
        pname = move.get("productName", "Unknown").strip()
        loc = move.get("fromLocationId") or move.get("location") or "Principal"
        qty = abs(float(move.get("quantity", 0)))
        m_date = parse_date(move.get("timestamp") or move.get("date"))
        
        if not m_date or m_date.replace(tzinfo=None) < cutoff_date:
            continue
            
        key = (pname, loc)
        day_str = m_date.strftime("%Y-%m-%d")
        if key not in consumption_history: consumption_history[key] = {}
        consumption_history[key][day_str] = consumption_history[key].get(day_str, 0) + qty

    results = []
    
    for product in products:
        # Default to 'auto' if field is missing. Only skip if explicitly 'manual'.
        if product.get("thresholdMode", "auto") == "manual": continue
        
        pname = product.get("name", "").strip()
        ploc = product.get("location") or "Principal"
        pid = product.get("id")
        
        history = consumption_history.get((pname, ploc), {})
        
        # Build 30-day demand array
        demands = []
        for i in range(WINDOW_DAYS):
            d_key = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            demands.append(history.get(d_key, 0))
        
        total_sales_count = sum(1 for x in demands if x > 0)
        total_qty = sum(demands)
        
        # --- PREDICTION LOGIC V2 ---
        
        if total_sales_count >= MIN_SALES_FOR_STATS:
            # A. Statistical Mode (Robust)
            
            # 1. Outlier Filtering (Simple 3-sigma-ish)
            avg_all = total_qty / WINDOW_DAYS
            std_raw = math.sqrt(sum((x - avg_all)**2 for x in demands) / WINDOW_DAYS)
            filter_threshold = avg_all + (2.5 * std_raw) if std_raw > 0 else 999
            filtered_demands = [min(x, filter_threshold) if x > filter_threshold else x for x in demands]
            
            # 2. Weighted Moving Average (WMA)
            # W1 (0-7d): 0.5 | W2 (8-14d): 0.3 | W3 (15-30d): 0.2
            w1 = sum(filtered_demands[0:7]) / 7.0
            w2 = sum(filtered_demands[7:14]) / 7.0
            w3 = sum(filtered_demands[14:30]) / 16.0
            ads = (w1 * 0.5) + (w2 * 0.3) + (w3 * 0.2)
            
            # 3. Dynamic Lead Time & Safety multiplier
            # We recalculate std_dev on FILTERED demands for stable safety stock
            filtered_avg = sum(filtered_demands) / WINDOW_DAYS
            std_filtered = math.sqrt(sum((x - filtered_avg)**2 for x in filtered_demands) / WINDOW_DAYS)
            
            cv = (std_filtered / filtered_avg) if filtered_avg > 0 else 1
            safety_factor = 1.0 + min(cv, 1.0) 
            
            lead_time = 7 if ads < 1 else (10 if ads < 3 else 14)
            prediction_base = ads * lead_time
            
            # Safety Stock with cap (should not exceed 100% of base unless ADS is very low)
            raw_safety = Z_SCORE * std_filtered * math.sqrt(lead_time) * safety_factor
            safety_stock = min(raw_safety, prediction_base * 2) if ads > 0.5 else raw_safety
            
            target_stock = math.ceil(prediction_base + safety_stock)
            target_stock = max(target_stock, 4) 
        else:
            # B. Discovery Mode (New or Slow Items)
            # No guesswork based on current stock. Use smart safe defaults.
            ads = total_qty / WINDOW_DAYS
            existing_low = product.get("lowStockThreshold", 0)
            
            # If item is totally new/no sales: use 2 as safety.
            # If item has some tiny activity but not enough for stats: use 3-5.
            if total_qty == 0:
                target_stock = min(existing_low, 5) if existing_low > 0 else 3
            else:
                target_stock = 4
        
        # Logic: Low = Target, Critical = ~40% of Target
        low_threshold = target_stock
        critical_threshold = max(2, math.ceil(low_threshold * 0.4))
        
        results.append({
            "id": pid,
            "name": pname,
            "location": ploc,
            "ads": round(ads, 3),
            "targetStock": int(target_stock),
            "lowStockThreshold": int(low_threshold),
            "criticalStockThreshold": int(critical_threshold),
            "mode": "statistical" if total_sales_count >= MIN_SALES_FOR_STATS else "discovery"
        })
        
    return results

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input"}))
            sys.exit(1)
        data = json.loads(input_data)
        predictions = calculate_predictions(data)
        print(json.dumps({"success": True, "predictions": predictions}))
    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)
