import sys
import json
import math
from datetime import datetime, timedelta

def calculate_predictions(data):
    products = data.get("products", [])
    movements = data.get("movements", [])
    sales = data.get("sales", [])
    
    # 1. Map demand to calculate true variance and ADS
    # We group by (productName, location) to find consumption per location
    # We use both Sales and OUT movements, but avoid double counting
    movement_history = {}
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # Process Sales (Primary source of demand)
    for sale in sales:
        s_date_raw = sale.get("date")
        if not s_date_raw:
            continue
            
        pname = sale.get("productName", "Unknown").strip()
        loc = sale.get("location") or "Principal"
        qty = float(sale.get("quantity", 0))
        
        try:
            s_date = datetime.fromisoformat(s_date_raw.replace("Z", "+00:00"))
        except:
            continue
            
        if s_date.replace(tzinfo=None) < thirty_days_ago:
            continue
            
        day_key = s_date.strftime("%Y-%m-%d")
        history_key = (pname, loc)
        
        if history_key not in movement_history:
            movement_history[history_key] = {}
        movement_history[history_key][day_key] = movement_history[history_key].get(day_key, 0) + qty

    # Process Movements (Other OUT types like Adjustments, but skip Sale Pickups to avoid double count)
    for movement in movements:
        if movement.get("type") != "OUT":
            continue
            
        # If the reason contains "Venda" or "Levantamento", we skip it as it's likely already in 'sales'
        reason = movement.get("reason", "")
        if "Venda" in reason or "Levantamento" in reason:
            continue

        m_date_raw = movement.get("timestamp") or movement.get("date")
        if not m_date_raw:
            continue
            
        pname = movement.get("productName", "Unknown").strip()
        loc = movement.get("fromLocationId") or movement.get("location") or "Principal"
        qty = abs(float(movement.get("quantity", 0)))
        
        try:
            if isinstance(m_date_raw, dict) and "seconds" in m_date_raw:
               m_date = datetime.utcfromtimestamp(m_date_raw["seconds"])
            elif isinstance(m_date_raw, (int, float)):
               m_date = datetime.utcfromtimestamp(m_date_raw / 1000.0 if m_date_raw > 1e11 else m_date_raw)
            else:
               date_str = str(m_date_raw).strip()
               if "T" in date_str:
                   m_date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
               else:
                   m_date = datetime.strptime(date_str[:10], "%Y-%m-%d")
        except:
            continue
            
        if m_date.replace(tzinfo=None) < thirty_days_ago:
            continue
            
        day_key = m_date.strftime("%Y-%m-%d")
        history_key = (pname, loc)
        
        if history_key not in movement_history:
            movement_history[history_key] = {}
        movement_history[history_key][day_key] = movement_history[history_key].get(day_key, 0) + qty

    # 2. Compute Target Stock 
    Z_SCORE = 1.65
    results = []
    
    for product in products:
        if product.get("thresholdMode") == "manual":
            continue
            
        pname = product.get("name", "").strip()
        ploc = product.get("location") or "Principal"
        product_id = product.get("id")
        
        # Get history for THIS product in THIS location
        history = movement_history.get((pname, ploc), {})
        
        # Calculate daily demand array for the last 30 days
        daily_demands = []
        for i in range(30):
            d_key = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            daily_demands.append(history.get(d_key, 0))
            
        total_30d = sum(daily_demands)
        ads = total_30d / 30.0
        
        # Calculate Standard Deviation of daily demand
        if ads > 0:
            variance = sum((x - ads) ** 2 for x in daily_demands) / 30.0
            std_dev = math.sqrt(variance)
        else:
            std_dev = 0
            
        # Dynamically classify lead time to represent 'days cover' logic 
        if ads <= 0.5:
            lead_time = 7
        elif ads <= 2:
            lead_time = 10
        elif ads <= 5:
            lead_time = 14
        else:
            lead_time = 21
            
        # Safety Stock Calculation
        safety_stock = Z_SCORE * std_dev * math.sqrt(lead_time)
        
        # Calculate Target Stock
        theoretical_target = (ads * lead_time) + safety_stock
        
        # Determine Final Target Stock with safer logic
        if ads > 0:
            # Active items: use statistical target but ensure a minimum of 2
            target_stock = math.ceil(max(theoretical_target, 2))
        else:
            # No sales history: 
            # We don't want to guess 50% of stock (too aggressive)
            # But we also don't want 0 (risk of rupture for new items)
            # Use a conservative default (e.g., 2) or keep existing if reasonable
            existing_low = product.get("lowStockThreshold", 0)
            if existing_low > 0:
                # If they already have a threshold, don't zero it out, but cap it if it was wild
                target_stock = min(existing_low, 5) 
            else:
                target_stock = 2
        
        low_stock = target_stock
        critical_stock = max(1, math.ceil(low_stock / 2))
        
        results.append({
            "id": product_id,
            "name": pname,
            "ads": round(ads, 3),
            "stdDev": round(std_dev, 2),
            "safetyStock": math.ceil(safety_stock),
            "lowStockThreshold": int(low_stock),
            "criticalStockThreshold": int(critical_stock),
            "targetStock": int(target_stock)
        })
        
    return results
        
if __name__ == "__main__":
    try:
        # Read from stdin
        input_data = sys.stdin.read()
        if not input_data:
             print(json.dumps({"error": "No input data provided"}))
             sys.exit(1)
             
        data = json.loads(input_data)
        predictions = calculate_predictions(data)
        
        # Print JSON to stdout
        print(json.dumps({"success": True, "predictions": predictions}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
