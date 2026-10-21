#!/bin/bash
# 식물환자 — 올리기 전 내 컴퓨터에서 미리 보기 (GitHub에 올리지 않음)
cd "$(dirname "$0")/docs" || exit 1
PORT=8765
echo "미리 보기 주소: http://localhost:$PORT/  (당도 시뮬레이터: http://localhost:$PORT/simulator.html)"
echo "끝내려면 이 창을 닫으세요."
(sleep 1; open "http://localhost:$PORT/index.html") &
python3 -m http.server $PORT
