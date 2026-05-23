#!/usr/bin/env bash
node scripts/getImage.js --batch=all --target=1 --output="data/images" &
PID=$!
echo "PID: $PID"
echo "Log: data/image_download.log"
echo "Resume: data/.download_progress.log"
echo "To stop: kill $PID"
echo "To resume later: just run this script again"
wait $PID
