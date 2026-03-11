# TODO - Fix generateProducts.js

## Issues to Fix:
1. [ ] Description extraction failing for HL products (returns default)
2. [ ] Description extraction failing for PDFs 
3. [ ] Specs extraction broken for PDFs (keys merged with values)
4. [ ] Ensure applications are extracted correctly

## Plan:
1. Fix `extractDescription` function to handle:
   - HL products: Find description after specs section (after "Color/acabados")
   - PDFs: Handle "Descripción:" with different capitalizations
   - Better fallback logic

2. Fix `extractSpecs` function to handle:
   - PDF format: "Key Value" without colons
   - Better key-value separation logic
   - Handle different separators (:)

3. Fix `extractApplications` function to:
   - Better detection of applications section in PDFs
   - Handle bullet points correctly

## Files to modify:
- generateProducts.js

## Testing:
- Run `node generateProducts.js` and verify:
  - All products have proper descriptions (not defaults)
  - Specs have correct key-value pairs
  - Applications are extracted

