import json
import random

years = list(range(2000, 2023))
regions = [
    # US States (Partial list for brevity, or full if needed. I'll use IDs or names matching TopoJSON)
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
    "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
    "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
    # Canada Provinces
    "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon"
]

data = {}

for region in regions:
    data[region] = {}
    base_mortality = random.uniform(20, 80)
    for year in years:
        # Add some trend
        trend = (year - 2000) * random.uniform(-0.5, 0.5)
        mortality = max(0, min(100, base_mortality + trend + random.uniform(-5, 5)))
        
        data[region][year] = {
            "mortality_rate": round(mortality, 2),
            "economic_status": random.choice(["Low", "Med", "High"]),
            "education_level": random.choice(["10%-", "10-25%", "25%+"])
        }

with open('data/mock_data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Mock data generated in data/mock_data.json")
