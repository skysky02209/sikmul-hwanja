#!/bin/bash
# 식물환자 앱 — GitHub Pages 배포 (Finder에서 더블클릭)
# 토큰은 파일에 저장하지 않고, 맥 키체인에 저장된 GitHub 자격증명을 그때그때 읽어 씁니다.
cd "$(dirname "$0")"
U=skysky02209; R=sikmul-hwanja
rm -f .git/HEAD.lock .git/index.lock 2>/dev/null
{
  echo "========================================"
  echo "[식물환자] GitHub Pages 배포 $(date '+%Y-%m-%d %H:%M:%S')"
  echo "========================================"

  # 0) 빌드 (npm이 있으면 새로 빌드, 없으면 들어 있는 docs/ 그대로 배포)
  if command -v npm >/dev/null 2>&1; then
    echo "[0] 빌드..."
    [ -d node_modules ] || npm install --no-audit --no-fund
    if npm run build; then echo "    -> 빌드 성공"; else echo "    -> 빌드 실패: 기존 docs/로 진행"; fi
  else
    echo "[0] npm 없음 -> 미리 빌드된 docs/ 사용"
  fi

  # 1) git 준비 + 커밋
  [ -d .git ] || git init -q
  git symbolic-ref HEAD refs/heads/main 2>/dev/null
  git add -A
  git -c user.email=skysky02209@gmail.com -c user.name="$U" commit -q -m "deploy sikmul-hwanja $(date '+%Y-%m-%d %H:%M')" >/dev/null 2>&1
  echo "[1] 커밋 완료: $(git log --oneline -1 2>/dev/null)"

  # 2) 키체인 자격증명으로 레포 생성 (이미 있으면 무시)
  TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
  if [ -n "$TOKEN" ]; then
    echo "[2] GitHub 자격증명 확인"
    CODE=$(curl -s -o /tmp/sikmul_repo.json -w "%{http_code}" -X POST \
      -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
      https://api.github.com/user/repos -d '{"name":"'"$R"'","private":false,"description":"식물환자 재배 환경·관수 시뮬레이션 대시보드 (테스트 모드)"}')
    echo "    레포 생성 응답: HTTP $CODE (201=생성, 422=이미 있음)"
  else
    echo "[2] 저장된 GitHub 토큰 없음 -> push 때 로그인 창이 뜰 수 있습니다"
  fi

  # 3) push
  git remote remove origin >/dev/null 2>&1
  git remote add origin "https://github.com/$U/$R.git"
  echo "[3] push..."
  if git push -u origin main --force; then echo "    -> push 성공"; PUSH_OK=1; else echo "    -> push 실패"; PUSH_OK=0; fi

  # 4) Pages 켜기 (main 브랜치 /docs)
  if [ -n "$TOKEN" ] && [ "$PUSH_OK" = "1" ]; then
    echo "[4] GitHub Pages 설정 (main /docs)..."
    PCODE=$(curl -s -o /tmp/sikmul_pages.json -w "%{http_code}" -X POST \
      -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/$U/$R/pages" -d '{"source":{"branch":"main","path":"/docs"}}')
    echo "    Pages 응답: HTTP $PCODE (201=활성화, 409=이미 활성화)"
    if [ "$PCODE" = "409" ]; then
      curl -s -o /dev/null -X PUT -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
        "https://api.github.com/repos/$U/$R/pages" -d '{"source":{"branch":"main","path":"/docs"}}'
    fi
  fi
  unset TOKEN

  URL="https://$U.github.io/$R/"
  echo "$URL" > deploy_url.txt
  echo "========================================"
  echo "[완료] 공개 주소: $URL"
  echo "  (첫 배포는 1~3분 뒤에 열립니다)"
  echo "========================================"
} 2>&1 | tee deploy_log.txt

URL=$(cat deploy_url.txt 2>/dev/null)
[ -n "$URL" ] && command -v open >/dev/null && (sleep 60; open "$URL") &
echo; echo "[이 창은 엔터를 누르면 닫힙니다]"; read _
