#!/bin/bash

BASE_URL="http://localhost:3000/api"
ORDER_ID=1

echo "--- QA Magic Links Test ---"
echo "Base URL: $BASE_URL"

# 0. Find a valid Order ID
echo -e "\n0. Finding valid Order ID..."
EVENTS_JSON=$(curl -s "$BASE_URL/events")
# Quick extraction of first \"id\"
ORDER_ID=$(echo "$EVENTS_JSON" | grep -o '"id":\"[^\"]*"' | head -n 1 | cut -d'"' -f4)
# If ID is number in JSON (not string), regex might need adjustment
if [ -z "$ORDER_ID" ]; then
   # try finding integer id
   ORDER_ID=$(echo "$EVENTS_JSON" | grep -o '"id":[0-9]*' | head -n 1 | cut -d':' -f2)
fi

if [ -z "$ORDER_ID" ]; then
  # Fallback
  echo "⚠️ Could not find order from /events. Using default 1."
  ORDER_ID=1
  echo "Events JSON sample: ${EVENTS_JSON:0:100}..."
else 
  echo "✅ Found valid Order ID: $ORDER_ID"
fi

echo "Testing with Order ID: $ORDER_ID"

# 1. Generate Link
echo -e "\n1. Generating Link..."
GEN_RES=$(curl -v -X POST "$BASE_URL/magic-links/generate" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\": \"$ORDER_ID\"}")

echo "Response Body: $GEN_RES"
TOKEN=$(echo "$GEN_RES" | grep -o '"raw_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to generate token. (Or token already exists and hidden)"
  # If token hidden, we might need to regenerate to get a fresh one for testing
  echo "Trying regenerate to force a new token..."
  GEN_RES=$(curl -v -X POST "$BASE_URL/magic-links/regenerate" \
    -H "Content-Type: application/json" \
    -d "{\"orderId\": \"$ORDER_ID\"}")
  echo "Regenerate Response Body: $GEN_RES"
  TOKEN=$(echo "$GEN_RES" | grep -o '"raw_token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "❌ CRITICAL: Could not get a token. Exiting."
  exit 1
fi

echo "✅ Token Generated: $TOKEN"

# 2. Validate Valid Link
echo -e "\n2. Validating Link..."
VAL_RES=$(curl -s "$BASE_URL/magic-links/validate/$TOKEN")
echo "Response: $VAL_RES"

if [[ "$VAL_RES" == *"\"valid\":true"* ]]; then
  echo "✅ Validation Successful"
else
  echo "❌ Validation Failed"
  exit 1
fi

# 3. Validate Invalid Link
echo -e "\n3. Validating Invalid Token..."
INV_RES=$(curl -s "$BASE_URL/magic-links/validate/invalid_token_123")
echo "Response: $INV_RES"

if [[ "$INV_RES" == *"\"valid\":false"* ]]; then
  echo "✅ Invalid Token correctly rejected"
else
  echo "❌ Invalid Token NOT rejected"
  exit 1
fi

# 4. Regenerate Link
echo -e "\n4. Regenerating Link..."
REG_RES=$(curl -s -X POST "$BASE_URL/magic-links/regenerate" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\": $ORDER_ID}")
echo "Response: $REG_RES"
NEW_TOKEN=$(echo "$REG_RES" | grep -o '"raw_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$NEW_TOKEN" ]; then
  echo "❌ Failed to regenerate token"
  exit 1
fi
echo "✅ New Token: $NEW_TOKEN"

# 5. Validate Old Link (Should fail)
echo -e "\n5. Validating OLD Token (expecting failure)..."
OLD_VAL_RES=$(curl -s "$BASE_URL/magic-links/validate/$TOKEN")
echo "Response: $OLD_VAL_RES"

if [[ "$OLD_VAL_RES" == *"\"valid\":false"* ]]; then
  echo "✅ Old Token successfully revoked"
else
  echo "❌ Old Token still valid!"
  exit 1
fi

# 6. Validate New Link (Should pass)
echo -e "\n6. Validating NEW Token..."
NEW_VAL_RES=$(curl -s "$BASE_URL/magic-links/validate/$NEW_TOKEN")
echo "Response: $NEW_VAL_RES"

if [[ "$NEW_VAL_RES" == *"\"valid\":true"* ]]; then
  echo "✅ New Token valid"
else
  echo "❌ New Token invalid"
  exit 1
fi

echo -e "\n--- QA COMPLETE: ALL TESTS PASSED ---"
