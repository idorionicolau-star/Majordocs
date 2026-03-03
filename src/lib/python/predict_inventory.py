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
            
        pid = movement.get("productName", "Unknown")
        
        # Parse ISO date or simplify (fallback wrapper)
        try:
            # If it's a dict like Firebase Timestamp {"seconds": ...}
            if isinstance(m_date_raw, dict) and "seconds" in m_date_raw:
               m_date = datetime.utcfromtimestamp(m_date_raw["seconds"])
            else:
               # Try to parse string timestamp, taking only first 10 chars (YYYY-MM-DD)
               # e.g. "2024-03-03T00:00:00.000Z" -> replace Z
               date_str = str(m_date_raw).strip()
               if "T" in date_str:
                   date_str = date_str.replace("Z", "+00:00")
                   m_date = datetime.fromisoformat(date_str)
               else:
                   # Maybe just a simple YYYY-MM-DD
                   m_date = datetime.strptime(date_str[:10], "%Y-%m-%d")
        except Exception as e:
            # Print to stderr for debugging
            print(f"DEBUG: Skipping movement for {pid} due to date parse error on '{m_date_raw}': {e}", file=sys.stderr)
            continue
            
        if m_date.replace(tzinfo=None) < thirty_days_ago:
            continue
            
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
        if ads > 0:
            minimum_safe = 2
            target_stock = max(target_stock, minimum_safe)
        else:
            # HYBRID LOGIC: Se não há histórico de vendas (ads == 0),
            # O nosso Target Inicial de Aviso será igual a 50% do stock real que está na prateleira hoje.
            # Assume-se que a primeira encomenda representa a "Visão" do gestor, e o alerta deve disparar a meio.
            current_stock = product.get("stock", 0) - product.get("reservedStock", 0)
            target_stock = max(1, math.ceil(current_stock / 2)) # Metade do stock atual como linha de alerta inicial
        
        
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
