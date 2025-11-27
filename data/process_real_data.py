import json
import pandas as pd
import numpy as np

# Load configuration
with open('data/data_sources_config.json', 'r') as f:
    config = json.load(f)

# Initialize output structure
output_data = {}

print("Processing US Mortality Data from CDC Socrata...")
# Load US Mortality data
with open('data/raw/us_mortality_socrata.json', 'r') as f:
    us_mortality = json.load(f)

# Convert to DataFrame
df_us_mortality = pd.DataFrame(us_mortality)
print(f"Loaded {len(df_us_mortality)} US mortality records")
print(f"Years available: {sorted(df_us_mortality['year'].unique())}")
print(f"States: {df_us_mortality['state'].nunique()}")

# Process each US state
us_states = config['regions']['United States']
years = list(range(config['time_range']['start_year'], config['time_range']['end_year'] + 1))

for state in us_states:
    output_data[state] = {}
    
    # Get mortality data for this state
    state_data = df_us_mortality[df_us_mortality['state'] == state]
    
    for year in years:
        year_data = state_data[state_data['year'] == str(year)]
        
        if len(year_data) > 0:
            # aadr is age-adjusted death rate per 100,000
            mortality_rate = float(year_data.iloc[0]['aadr'])
        else:
            # If data not available, use a placeholder or interpolate
            mortality_rate = 50.0  # Placeholder
        
        # Create entry with mock data for other metrics (to be replaced)
        output_data[state][year] = {
            "mortality_rate": round(mortality_rate, 2),
            "physician": round(np.random.uniform(1, 6), 2),  # Mock for now
            "insurance": round(np.random.uniform(80, 100), 1),  # Mock for now
            "expenditure": int(np.random.uniform(3000, 8000)),  # Mock for now
            "economic_status": np.random.choice(['Low', 'Med', 'High']),  # Mock for now
            "education_level": np.random.choice(['10%-', '10-25%', '25%+'])  # Mock for now
        }

print(f"\nProcessed {len(output_data)} US states")

# Add Canadian provinces with mock data (waiting for StatCan data)
print("\nAdding Canadian provinces with mock data (waiting for real data)...")
for province in config['regions']['Canada']:
    output_data[province] = {}
    for year in years:
        output_data[province][year] = {
            "mortality_rate": round(np.random.uniform(20, 80), 2),
            "physician": round(np.random.uniform(1, 6), 2),
            "insurance": round(np.random.uniform(80, 100), 1),
            "expenditure": int(np.random.uniform(3000, 8000)),
            "economic_status": np.random.choice(['Low', 'Med', 'High']),
            "education_level": np.random.choice(['10%-', '10-25%', '25%+'])
        }

# Save output
output_file = 'data/real_data_v1.json'
with open(output_file, 'w') as f:
    json.dump(output_data, f, indent=2)

print(f"\n✓ Saved processed data to {output_file}")
print(f"✓ Total regions: {len(output_data)}")
print(f"✓ Years covered: {config['time_range']['start_year']}-{config['time_range']['end_year']}")
print("\nNOTE: Physician, insurance, expenditure, economic, and education data are still MOCK.")
print("These will be replaced with real data in subsequent processing steps.")
