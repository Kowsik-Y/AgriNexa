"""
AgriFlow Configuration - Crop database, thresholds, and reference data.
"""

# ──────────────────────────────────────────────────────────────
# CROP DATABASE: optimal growing conditions for each crop
# ──────────────────────────────────────────────────────────────
CROP_DATABASE = {
    "Rice": {
        "nitrogen": (60, 120), "phosphorus": (35, 60), "potassium": (35, 60),
        "ph": (5.5, 7.0), "temperature": (20, 35), "humidity": (60, 95),
        "growth_duration_days": 120, "water_requirement_mm": 1200,
    },
    "Wheat": {
        "nitrogen": (80, 130), "phosphorus": (40, 65), "potassium": (30, 55),
        "ph": (6.0, 7.5), "temperature": (10, 25), "humidity": (40, 70),
        "growth_duration_days": 130, "water_requirement_mm": 450,
    },
    "Maize": {
        "nitrogen": (60, 120), "phosphorus": (35, 60), "potassium": (30, 55),
        "ph": (5.5, 7.5), "temperature": (18, 32), "humidity": (50, 80),
        "growth_duration_days": 110, "water_requirement_mm": 600,
    },
    "Cotton": {
        "nitrogen": (80, 140), "phosphorus": (40, 70), "potassium": (20, 50),
        "ph": (5.8, 8.0), "temperature": (21, 35), "humidity": (40, 70),
        "growth_duration_days": 170, "water_requirement_mm": 700,
    },
    "Sugarcane": {
        "nitrogen": (70, 130), "phosphorus": (20, 55), "potassium": (25, 55),
        "ph": (5.0, 8.5), "temperature": (20, 38), "humidity": (60, 90),
        "growth_duration_days": 365, "water_requirement_mm": 2000,
    },
    "Groundnut": {
        "nitrogen": (20, 50), "phosphorus": (40, 70), "potassium": (20, 50),
        "ph": (5.5, 7.0), "temperature": (24, 33), "humidity": (50, 80),
        "growth_duration_days": 120, "water_requirement_mm": 500,
    },
    "Millets": {
        "nitrogen": (40, 80), "phosphorus": (20, 45), "potassium": (20, 45),
        "ph": (5.5, 7.5), "temperature": (25, 35), "humidity": (30, 65),
        "growth_duration_days": 90, "water_requirement_mm": 350,
    },
    "Pulses": {
        "nitrogen": (15, 40), "phosphorus": (35, 65), "potassium": (20, 50),
        "ph": (6.0, 7.5), "temperature": (20, 30), "humidity": (40, 70),
        "growth_duration_days": 100, "water_requirement_mm": 400,
    },
    "Jute": {
        "nitrogen": (60, 110), "phosphorus": (30, 55), "potassium": (30, 55),
        "ph": (5.5, 7.0), "temperature": (25, 37), "humidity": (70, 95),
        "growth_duration_days": 150, "water_requirement_mm": 1500,
    },
    "Coffee": {
        "nitrogen": (80, 140), "phosphorus": (15, 40), "potassium": (25, 55),
        "ph": (5.0, 6.5), "temperature": (15, 28), "humidity": (60, 90),
        "growth_duration_days": 270, "water_requirement_mm": 1500,
    },
}

# ──────────────────────────────────────────────────────────────
# SEED VARIETIES PER CROP
# ──────────────────────────────────────────────────────────────
SEED_VARIETIES = {
    "Rice": [
        {"name": "IR64", "type": "High-yield", "duration_days": 115, "season": "Kharif", "yield_per_acre_kg": 2800},
        {"name": "Basmati 370", "type": "Aromatic", "duration_days": 140, "season": "Kharif", "yield_per_acre_kg": 2200},
        {"name": "Ponni", "type": "Traditional", "duration_days": 135, "season": "Samba", "yield_per_acre_kg": 2500},
        {"name": "Sona Masuri", "type": "Medium-grain", "duration_days": 120, "season": "Kharif/Rabi", "yield_per_acre_kg": 2600},
        {"name": "ADT 43", "type": "Short-duration", "duration_days": 110, "season": "Kuruvai", "yield_per_acre_kg": 2400},
    ],
    "Wheat": [
        {"name": "HD 2967", "type": "High-yield", "duration_days": 145, "season": "Rabi", "yield_per_acre_kg": 2200},
        {"name": "PBW 343", "type": "Rust-resistant", "duration_days": 135, "season": "Rabi", "yield_per_acre_kg": 2000},
        {"name": "WH 542", "type": "Bread wheat", "duration_days": 140, "season": "Rabi", "yield_per_acre_kg": 1900},
        {"name": "Lok-1", "type": "Drought-tolerant", "duration_days": 120, "season": "Rabi", "yield_per_acre_kg": 1800},
    ],
    "Maize": [
        {"name": "DHM 117", "type": "Hybrid", "duration_days": 105, "season": "Kharif", "yield_per_acre_kg": 3200},
        {"name": "HQPM 1", "type": "Quality Protein", "duration_days": 95, "season": "Kharif/Rabi", "yield_per_acre_kg": 2800},
        {"name": "Vivek QPM 9", "type": "QPM Hybrid", "duration_days": 90, "season": "Kharif", "yield_per_acre_kg": 2600},
    ],
    "Cotton": [
        {"name": "Bt Cotton (Bollgard II)", "type": "Transgenic", "duration_days": 170, "season": "Kharif", "yield_per_acre_kg": 1000},
        {"name": "Suraj", "type": "Desi", "duration_days": 160, "season": "Kharif", "yield_per_acre_kg": 600},
        {"name": "MCU-5", "type": "Long-staple", "duration_days": 165, "season": "Kharif", "yield_per_acre_kg": 800},
    ],
    "Sugarcane": [
        {"name": "Co 86032", "type": "High-sugar", "duration_days": 360, "season": "Year-round", "yield_per_acre_kg": 45000},
        {"name": "CoC 671", "type": "Early-maturing", "duration_days": 330, "season": "Year-round", "yield_per_acre_kg": 40000},
        {"name": "Co 0238", "type": "High-yield", "duration_days": 350, "season": "Year-round", "yield_per_acre_kg": 48000},
    ],
    "Groundnut": [
        {"name": "TMV 2", "type": "Bunch", "duration_days": 105, "season": "Kharif", "yield_per_acre_kg": 1200},
        {"name": "JL 24", "type": "Semi-spreading", "duration_days": 110, "season": "Kharif/Rabi", "yield_per_acre_kg": 1400},
        {"name": "TAG 24", "type": "High-oil", "duration_days": 115, "season": "Rabi/Summer", "yield_per_acre_kg": 1500},
    ],
    "Millets": [
        {"name": "CO 9", "type": "Cumbu (Pearl Millet)", "duration_days": 85, "season": "Kharif", "yield_per_acre_kg": 1200},
        {"name": "GPU 28", "type": "Ragi (Finger Millet)", "duration_days": 110, "season": "Kharif", "yield_per_acre_kg": 1000},
        {"name": "CSV 23", "type": "Jowar (Sorghum)", "duration_days": 100, "season": "Kharif/Rabi", "yield_per_acre_kg": 1100},
    ],
    "Pulses": [
        {"name": "Pusa 256", "type": "Chickpea", "duration_days": 95, "season": "Rabi", "yield_per_acre_kg": 800},
        {"name": "IPM 02-3", "type": "Pigeon Pea", "duration_days": 130, "season": "Kharif", "yield_per_acre_kg": 700},
        {"name": "KM 2", "type": "Green Gram", "duration_days": 65, "season": "Kharif/Summer", "yield_per_acre_kg": 500},
    ],
    "Jute": [
        {"name": "JRC 321", "type": "Capsularis", "duration_days": 140, "season": "Kharif", "yield_per_acre_kg": 1200},
        {"name": "JRO 524", "type": "Olitorius", "duration_days": 130, "season": "Kharif", "yield_per_acre_kg": 1400},
    ],
    "Coffee": [
        {"name": "Selection 795", "type": "Arabica", "duration_days": 270, "season": "Perennial", "yield_per_acre_kg": 500},
        {"name": "CxR", "type": "Robusta", "duration_days": 240, "season": "Perennial", "yield_per_acre_kg": 700},
    ],
}

# ──────────────────────────────────────────────────────────────
# FERTILIZER RULES
# ──────────────────────────────────────────────────────────────
FERTILIZER_MAP = {
    "nitrogen": {
        "fertilizer": "Urea (46-0-0)",
        "dosage_per_acre_kg": 50,
        "application": "Basal + top dressing at tillering stage",
        "note": "Split into 2-3 applications for better absorption",
    },
    "phosphorus": {
        "fertilizer": "DAP (18-46-0)",
        "dosage_per_acre_kg": 40,
        "application": "Apply at sowing/transplanting as basal dose",
        "note": "Mix well with soil before planting",
    },
    "potassium": {
        "fertilizer": "MOP (0-0-60)",
        "dosage_per_acre_kg": 35,
        "application": "Apply as basal dose or split 50-50",
        "note": "Essential for grain filling and disease resistance",
    },
}

# ──────────────────────────────────────────────────────────────
# IRRIGATION THRESHOLDS (soil moisture %)
# ──────────────────────────────────────────────────────────────
IRRIGATION_THRESHOLDS = {
    "Rice": {"critical": 70, "optimal": 85, "method": "Flood irrigation / SRI method", "frequency": "Daily to alternate days"},
    "Wheat": {"critical": 35, "optimal": 55, "method": "Sprinkler / Border irrigation", "frequency": "Every 15-20 days"},
    "Maize": {"critical": 40, "optimal": 60, "method": "Furrow / Drip irrigation", "frequency": "Every 7-10 days"},
    "Cotton": {"critical": 35, "optimal": 55, "method": "Drip / Furrow irrigation", "frequency": "Every 10-15 days"},
    "Sugarcane": {"critical": 50, "optimal": 70, "method": "Furrow / Drip irrigation", "frequency": "Every 7-10 days"},
    "Groundnut": {"critical": 30, "optimal": 50, "method": "Sprinkler irrigation", "frequency": "Every 10-15 days"},
    "Millets": {"critical": 25, "optimal": 40, "method": "Rain-fed / Supplemental irrigation", "frequency": "Every 15-20 days"},
    "Pulses": {"critical": 30, "optimal": 50, "method": "Sprinkler / Drip irrigation", "frequency": "Every 12-15 days"},
    "Jute": {"critical": 55, "optimal": 75, "method": "Flood / Surface irrigation", "frequency": "Every 5-7 days"},
    "Coffee": {"critical": 40, "optimal": 60, "method": "Drip irrigation", "frequency": "Every 5-7 days"},
}

# ──────────────────────────────────────────────────────────────
# COMMON PESTS PER CROP
# ──────────────────────────────────────────────────────────────
PEST_DATABASE = {
    "Rice": [
        {"pest": "Stem Borer", "risk_level": "High", "pesticide": "Chlorantraniliprole 0.4% GR", "prevention": "Use pheromone traps, remove dead hearts"},
        {"pest": "Brown Plant Hopper", "risk_level": "High", "pesticide": "Pymetrozine 50% WG", "prevention": "Avoid excess nitrogen, maintain field drainage"},
        {"pest": "Leaf Folder", "risk_level": "Medium", "pesticide": "Cartap Hydrochloride 4% GR", "prevention": "Light traps, clipping affected leaves"},
    ],
    "Wheat": [
        {"pest": "Aphids", "risk_level": "Medium", "pesticide": "Imidacloprid 17.8% SL", "prevention": "Timely sowing, seed treatment"},
        {"pest": "Rust (Yellow/Brown)", "risk_level": "High", "pesticide": "Propiconazole 25% EC", "prevention": "Grow resistant varieties, timely sowing"},
        {"pest": "Termites", "risk_level": "Medium", "pesticide": "Chlorpyriphos 20% EC", "prevention": "Seed treatment with Chlorpyriphos"},
    ],
    "Maize": [
        {"pest": "Fall Armyworm", "risk_level": "High", "pesticide": "Spinetoram 11.7% SC", "prevention": "Early sowing, intercropping, pheromone traps"},
        {"pest": "Stem Borer", "risk_level": "Medium", "pesticide": "Carbofuran 3% CG", "prevention": "Remove and destroy crop residues"},
    ],
    "Cotton": [
        {"pest": "Pink Bollworm", "risk_level": "High", "pesticide": "Profenophos 50% EC", "prevention": "Pheromone traps, timely picking of bolls"},
        {"pest": "Whitefly", "risk_level": "High", "pesticide": "Diafenthiuron 50% WP", "prevention": "Yellow sticky traps, neem oil spray"},
        {"pest": "American Bollworm", "risk_level": "Medium", "pesticide": "Emamectin Benzoate 5% SG", "prevention": "NPV sprays, refuge crop planting"},
    ],
    "Sugarcane": [
        {"pest": "Early Shoot Borer", "risk_level": "High", "pesticide": "Fipronil 0.3% GR", "prevention": "Remove dead hearts, light traps"},
        {"pest": "Woolly Aphid", "risk_level": "Medium", "pesticide": "Chlorpyriphos 20% EC", "prevention": "Release natural enemies (ladybird beetles)"},
    ],
    "Groundnut": [
        {"pest": "Leaf Miner", "risk_level": "Medium", "pesticide": "Dimethoate 30% EC", "prevention": "Deep summer ploughing, intercropping"},
        {"pest": "Tikka Disease", "risk_level": "High", "pesticide": "Mancozeb 75% WP", "prevention": "Seed treatment, crop rotation"},
    ],
    "Millets": [
        {"pest": "Shoot Fly", "risk_level": "Medium", "pesticide": "Carbofuran 3% CG", "prevention": "Early sowing within recommended window"},
        {"pest": "Head Smut", "risk_level": "Low", "pesticide": "Thiram 75% WP (seed treatment)", "prevention": "Use treated seeds, crop rotation"},
    ],
    "Pulses": [
        {"pest": "Pod Borer", "risk_level": "High", "pesticide": "Spinosad 45% SC", "prevention": "Bird perches, HaNPV spray, neem oil"},
        {"pest": "Wilt", "risk_level": "Medium", "pesticide": "Trichoderma viride (bio)", "prevention": "Seed treatment, resistant varieties"},
    ],
    "Jute": [
        {"pest": "Semilooper", "risk_level": "Medium", "pesticide": "Quinalphos 25% EC", "prevention": "Hand picking, maintain clean fields"},
        {"pest": "Stem Rot", "risk_level": "Medium", "pesticide": "Carbendazim 50% WP", "prevention": "Proper spacing, drainage management"},
    ],
    "Coffee": [
        {"pest": "Coffee Berry Borer", "risk_level": "High", "pesticide": "Chlorpyriphos 20% EC", "prevention": "Strip picking, maintain shade trees"},
        {"pest": "White Stem Borer", "risk_level": "Medium", "pesticide": "Lindane 20% EC (trunk injection)", "prevention": "Remove loose bark, apply Bordeaux paste"},
    ],
}

# ──────────────────────────────────────────────────────────────
# GROWTH STAGES
# ──────────────────────────────────────────────────────────────
GROWTH_STAGES = {
    "Rice": ["Germination", "Seedling", "Tillering", "Stem Elongation", "Booting", "Heading", "Flowering", "Grain Filling", "Maturity"],
    "Wheat": ["Germination", "Seedling", "Tillering", "Stem Extension", "Booting", "Heading", "Flowering", "Grain Filling", "Maturity"],
    "Maize": ["Emergence", "V3 (3-leaf)", "V6 (6-leaf)", "V12 (12-leaf)", "Tasseling", "Silking", "Blister", "Dent", "Maturity"],
    "Cotton": ["Emergence", "Seedling", "Square Formation", "Flowering", "Boll Development", "Boll Opening", "Maturity"],
    "Sugarcane": ["Germination", "Tillering", "Grand Growth", "Maturity"],
    "Groundnut": ["Emergence", "Seedling", "Flowering", "Peg Penetration", "Pod Development", "Maturity"],
    "Millets": ["Emergence", "Seedling", "Tillering", "Flag Leaf", "Heading", "Grain Filling", "Maturity"],
    "Pulses": ["Germination", "Seedling", "Branching", "Flowering", "Pod Formation", "Grain Filling", "Maturity"],
    "Jute": ["Germination", "Seedling", "Vegetative Growth", "Fibre Development", "Flowering", "Maturity"],
    "Coffee": ["Germination", "Seedling", "Vegetative", "Blossom", "Berry Development", "Ripening"],
}

# ──────────────────────────────────────────────────────────────
# STORAGE TECHNIQUES
# ──────────────────────────────────────────────────────────────
STORAGE_TECHNIQUES = {
    "Rice": {
        "method": "Hermetic storage bags or metal bins",
        "moisture_content": "12-14%",
        "max_duration_months": 12,
        "temperature": "Below 25°C",
        "tips": ["Dry paddy to 14% moisture before storage", "Use neem leaves as natural pest repellent", "Check for weevils every 2 weeks"],
    },
    "Wheat": {
        "method": "Pusa bins or metal silos",
        "moisture_content": "10-12%",
        "max_duration_months": 18,
        "temperature": "Below 20°C",
        "tips": ["Fumigate with Aluminium Phosphide tablets", "Stack bags on wooden dunnage", "Maintain good ventilation"],
    },
    "Maize": {
        "method": "Metal cribs or hermetic bags",
        "moisture_content": "12-13%",
        "max_duration_months": 10,
        "temperature": "Below 25°C",
        "tips": ["Dry cobs to safe moisture level", "Use triple-layer bags for hermetic storage"],
    },
    "Cotton": {
        "method": "Covered godowns with ventilation",
        "moisture_content": "8-10%",
        "max_duration_months": 6,
        "temperature": "Below 30°C",
        "tips": ["Keep away from moisture and fire", "Store in pressed bales"],
    },
    "Sugarcane": {
        "method": "Process within 24-48 hours of harvest",
        "moisture_content": "N/A - perishable",
        "max_duration_months": 0,
        "temperature": "Room temperature",
        "tips": ["Transport immediately to sugar mill", "Avoid delays to prevent sucrose loss"],
    },
    "Groundnut": {
        "method": "Jute bags or metal bins",
        "moisture_content": "8-10%",
        "max_duration_months": 8,
        "temperature": "Below 25°C",
        "tips": ["Dry pods properly before storage", "Monitor for aflatoxin contamination"],
    },
    "Millets": {
        "method": "Traditional mud bins or metal containers",
        "moisture_content": "10-12%",
        "max_duration_months": 24,
        "temperature": "Below 25°C",
        "tips": ["Millets store well for long periods", "Mix with dried neem leaves for protection"],
    },
    "Pulses": {
        "method": "Hermetic bags or metal bins",
        "moisture_content": "9-11%",
        "max_duration_months": 12,
        "temperature": "Below 20°C",
        "tips": ["Mix with edible oil to prevent bruchid attack", "Use vegetable oil coating at 5ml/kg"],
    },
    "Jute": {
        "method": "Dry godowns with proper ventilation",
        "moisture_content": "12-14%",
        "max_duration_months": 6,
        "temperature": "Below 30°C",
        "tips": ["Store in bales", "Keep away from moisture and rodents"],
    },
    "Coffee": {
        "method": "Jute bags in cool, dry warehouses",
        "moisture_content": "10-12%",
        "max_duration_months": 12,
        "temperature": "15-20°C",
        "tips": ["Store green beans in well-ventilated area", "Keep away from strong odors"],
    },
}

# ──────────────────────────────────────────────────────────────
# MARKET PRICE DATA (base prices in INR per kg)
# ──────────────────────────────────────────────────────────────
MARKET_DATA = {
    "Rice": {"base_price": 42, "msp_per_quintal": 2183, "best_selling_months": ["Oct", "Nov", "Dec"], "major_markets": ["Thanjavur", "Tiruvarur", "Nagapattinam"]},
    "Wheat": {"base_price": 28, "msp_per_quintal": 2275, "best_selling_months": ["Apr", "May", "Jun"], "major_markets": ["Delhi", "Ludhiana", "Indore"]},
    "Maize": {"base_price": 22, "msp_per_quintal": 2090, "best_selling_months": ["Sep", "Oct", "Nov"], "major_markets": ["Davangere", "Gulbarga", "Karimnagar"]},
    "Cotton": {"base_price": 65, "msp_per_quintal": 6620, "best_selling_months": ["Nov", "Dec", "Jan"], "major_markets": ["Rajkot", "Guntur", "Adilabad"]},
    "Sugarcane": {"base_price": 3.5, "msp_per_quintal": 315, "best_selling_months": ["Dec", "Jan", "Feb", "Mar"], "major_markets": ["Kolhapur", "Muzaffarnagar", "Lucknow"]},
    "Groundnut": {"base_price": 55, "msp_per_quintal": 6377, "best_selling_months": ["Nov", "Dec", "Jan"], "major_markets": ["Junagadh", "Anantapur", "Raichur"]},
    "Millets": {"base_price": 35, "msp_per_quintal": 2500, "best_selling_months": ["Oct", "Nov", "Dec"], "major_markets": ["Rajkot", "Jodhpur", "Chitradurga"]},
    "Pulses": {"base_price": 75, "msp_per_quintal": 6600, "best_selling_months": ["Mar", "Apr", "May"], "major_markets": ["Indore", "Latur", "Gulbarga"]},
    "Jute": {"base_price": 50, "msp_per_quintal": 5050, "best_selling_months": ["Aug", "Sep", "Oct"], "major_markets": ["Kolkata", "Siliguri", "Dhubri"]},
    "Coffee": {"base_price": 450, "msp_per_quintal": 0, "best_selling_months": ["Dec", "Jan", "Feb"], "major_markets": ["Chikmagalur", "Coorg", "Wayanad"]},
}
