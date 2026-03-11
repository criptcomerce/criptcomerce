#!/bin/bash
export BASE_URL="http://127.0.0.1:3000"
export COINGATE_WEBHOOK_SECRET="test-secret"

bash test/flow.sh
