# Shared prototype / rules result contract — v0.1

This file is the integration boundary for two parallel agents. Changes need coordinator review.

## Input shape (conceptual)
```json
{
  "segment": "homeowner | multiresidential | commercial",
  "location": { "province": "QC", "postalPrefix": null },
  "project": { "measures": [], "workStatus": "not_started | planned | underway | completed | unknown", "dates": {} },
  "answers": {}
}
```

## Result shape
```json
{
  "status": "information_required",
  "segment": "homeowner",
  "candidatePrograms": [
    {
      "id": "example-id",
      "name": "Program title",
      "officialUrl": "https://official.example.invalid",
      "verificationStatus": "unverified",
      "sourceCheckedAt": null,
      "reasons": [],
      "missingInformation": []
    }
  ],
  "figures": null,
  "nextSteps": [],
  "disclaimer": "Preliminary review only; this is not a funding decision."
}
```

The example URL above is a schema placeholder **not** a real funding source. Demo records must use actual official URLs when naming actual programs.

## Status meanings
- `estimate_available`: only after source-verification and sufficient required inputs.
- `information_required`: likely candidate, missing mandatory details; no amount.
- `manual_review`: complexity or source conflict; no amount.
- `not_eligible_for_checked_program`: verified exclusion for a particular checked program.
- `no_covered_match`: none in the limited catalog; does not mean no funding exists.
- `program_closed`: selected stream closed for this context/date.

## Rules
`figures` must remain `null` if any calculation rule or essential input is unverified, unknown or conflicting. All program estimates require effective version and trace to official rules. Never add amounts where grant stacking is unknown. The UI may show fictional scenarios only behind a prominent **EXAMPLE ONLY — NOT A REAL GRANT ESTIMATE** notice.
