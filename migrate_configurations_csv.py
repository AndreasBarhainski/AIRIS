import csv
import json

with open('configurations.csv', newline='') as infile, open('configurations_pg.csv', 'w', newline='') as outfile:
    reader = csv.DictReader(infile)
    writer = csv.writer(outfile)
    writer.writerow(['id', 'name', 'workflow_id', 'parameters', 'inputmodes'])
    for row in reader:
        # Compose the parameters jsonb field
        parameters = json.dumps({
            'description': row['description'],
            'parameterOverrides': json.loads(row['parameterOverrides'] or '{}'),
            'exposedParameters': json.loads(row['exposedParameters'] or '{}'),
            'parameterOrder': json.loads(row['parameterOrder'] or '[]')
        })
        # Use '{}' if inputModes is empty
        inputmodes = row['inputModes'] if row['inputModes'].strip() else '{}'
        writer.writerow([
            row['id'],
            row['name'],
            row['workflowId'],
            parameters,
            inputmodes
        ]) 