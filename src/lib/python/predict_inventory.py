import sys
import json
import math
from datetime import datetime, timedelta

def calculate_predictions(data):
    products = data.get("products", [])
    movements = data.get("movements", [])
    
    # 1. Map movements to calculate true variance and ADS
    # We want to group by day to find standard deviation of daily demand
    movement_history = {}
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    for movement in movements:
        if movement.get("type") != "OUT":
            continue
            
        m_date_raw = movement.get("timestamp") or movement.get("date")
        if not m_date_raw:
            continue
            
        # Parse ISO date or simplify (fallback wrapper)
        try:
            # We just need it to be within 30 days
            # If it's a JS date string, fromisoformat might fail, so we catch
            if isinstance(m_date_raw, dict) and "seconds" in m_date_raw:
               # Firebase timestamp
               m_date = datetime.utcfromtimestamp(m_date_raw["seconds"])
            else:
               # Try to parse string timestamp, taking only first 10 chars (YYYY-MM-DD)
               m_date = datetime.fromisoformat(str(m_date_raw).replace('Z', '+00:00'))
        except Exception:
            # If datetime parsing fails, we skip
            continue
            
        if m_date.replace(tzinfo=None) < thirty_days_ago:
            continue
            
        pid = movement.get("productName")
        if not pid:
            continue
            
        day_key = m_date.strftime("%Y-%m-%d")
        qty = abs(float(movement.get("quantity", 0)))
        
        if pid not in movement_history:
            movement_history[pid] = {}
        
        movement_history[pid][day_key] = movement_history[pid].get(day_key, 0) + qty

    # 2. Compute Target Stock 
    # Formula: (Lead Time * ADS) + Safety Stock
    # Safety Stock = Z * StdDev * sqrt(Lead Time)
    # Z = 1.65 (95% Service Level)
    
    Z_SCORE = 1.65
    
    results = []
    
    for product in products:
        if product.get("thresholdMode") == "manual":
            continue
            
        pid = product.get("name")
        history = movement_history.get(pid, {})
        
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
        # For items that move fast, we want longer cover time.
        if ads <= 0.5:
            # Very slow: assume 7 days to restock
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
        target_stock = math.ceil((ads * lead_time) + safety_stock)
        
        # Ensure it doesn't recommend 0 for active catalogue items
        # Minimum stock is always at least 1, or 2 if there's any movement at all.
        minimum_safe = 2 if ads > 0 else 1
        
        target_stock = max(target_stock, minimum_safe)
        
        # Also assign low and critical based on safety/lead time ratio
        # Low = Target Stock
        # Critical = mathematically half the target
        
        low_stock = target_stock
        critical_stock = math.ceil(low_stock / 2)
        
        results.append({
            "id": product.get("id"),
            "name": pid,
            "ads": ads,
            "stdDev": round(std_dev, 2),
            "safetyStock": math.ceil(safety_stock),
            "lowStockThreshold": low_stock,
            "criticalStockThreshold": critical_stock,
            "targetStock": target_stock
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
