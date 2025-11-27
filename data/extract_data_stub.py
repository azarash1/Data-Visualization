import json

def load_config():
    with open('data/data_sources_config.json', 'r') as f:
        return json.load(f)

def main():
    config = load_config()
    
    print(f"Loaded configuration: {config['project_info']['description']}")
    print(f"Targeting years: {config['time_range']['start_year']} - {config['time_range']['end_year']}")
    
    regions = config['regions']
    us_count = len(regions['United States'])
    ca_count = len(regions['Canada'])
    
    print(f"\nRegions to process:")
    print(f"  - United States: {us_count} states")
    print(f"  - Canada: {ca_count} provinces/territories")
    
    print(f"\nMetrics to extract:")
    for metric in config['metrics']:
        print(f"  - {metric['name']} ({metric['unit']})")
        print(f"    Source hints: {', '.join(metric['source_hints'])}")

    print("\n[STUB] Ready to implement API calls/Scrapers based on this config.")

if __name__ == "__main__":
    main()
