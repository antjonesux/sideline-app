# Threshold Verification Report

Generated: 2026-08-26T02:17:57.407Z

## Summary
- Playbooks verified: 28
- Playbooks safe: 28
- Playbooks at risk: 0

## Safe (no changes needed)
- air-force
- alabama
- arizona-state
- boise-state
- boston-college
- california
- east-carolina
- florida-atlantic
- illinois
- kansas
- liberty
- louisville
- miami
- michigan-state
- navy
- nebraska
- ohio-state
- oklahoma-state
- pro-style
- rice
- run-and-shoot
- sam-houston
- south-carolina
- spread-option
- usc
- veer-and-shoot
- washington-state
- western-kentucky

## At Risk (may have silent misassignments)
- (none)

## Notes
- At-risk playbooks: existing trusted mappings may be wrong. Do not re-ingest automatically.
- Operator should review each at-risk playbook individually.
- Threshold rules: distance ≤ max(4, ⌊seedLen×0.25⌋); OCR length ≥ max(4, ⌊seedLen×0.5⌋); unique within threshold.
