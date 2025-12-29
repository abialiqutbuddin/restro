#!/bin/bash

# Configuration
API_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "--- QA: Testing Magic Link Update Order ---"

# 1. Get an Order ID (hardcoded for reliability)
ORDER_ID=448
echo "Using Order ID: $ORDER_ID"

# 2. Generate Link (Regenerate to ensure we get a fresh token string)
echo "Generating (Regenerating) Magic Link..."
# Note: Added /api prefix
GEN_RESP=$(curl -s -X POST "$API_URL/api/magic-links/regenerate" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\": \"$ORDER_ID\"}")

TOKEN=$(echo $GEN_RESP | jq -r '.raw_token // .token')

echo "Gen Resp: $GEN_RESP"

if [ "$TOKEN" == "null" ] || [ "$TOKEN" == "" ]; then
    echo -e "${RED}Failed to generate token${NC}"
    exit 1
fi

echo -e "${GREEN}Token Generated: $TOKEN${NC}"

# 3. Update Order HEADCOUNT
NEW_HEADCOUNT=$((100 + RANDOM % 50))
echo "Updating Headcount to $NEW_HEADCOUNT..."

# Note: Added /api prefix
UPDATE_RESP=$(curl -s -X PATCH "$API_URL/api/magic-links/update-order/$TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"headcountEst\": $NEW_HEADCOUNT}")

# Check if headcount was updated in response
UPDATED_HC=$(echo $UPDATE_RESP | jq -r '.headcount_est')

if [ "$UPDATED_HC" == "$NEW_HEADCOUNT" ]; then
    echo -e "${GREEN}✅ Update Successful: Headcount is $UPDATED_HC${NC}"
else
    echo -e "${RED}❌ Update Failed. Response: $UPDATE_RESP${NC}"
    echo "Expected: $NEW_HEADCOUNT, Got: $UPDATED_HC"
    exit 1
fi

# 4. Verify via Validate
echo "Verifying via Validate Endpoint..."
# Note: Added /api prefix
VAL_RESP=$(curl -s "$API_URL/api/magic-links/validate/$TOKEN")
VAL_HC=$(echo $VAL_RESP | jq -r '.event.headcount_est')

if [ "$VAL_HC" == "$NEW_HEADCOUNT" ]; then
    echo -e "${GREEN}✅ Verification Successful: Headcount is persistent${NC}"
else
    echo -e "${RED}❌ Verification Failed. Got: $VAL_HC${NC}"
    exit 1
fi

echo "--- QA UPDATE COMPLETE: PASSED ---"
