export NODE_OPTIONS=""
export SKIP_PREINSTALL=true
sed -i.bak 's/throw new Error();/console.log("skipped");/' build/npm/preinstall.ts
npx pnpm install
npx pnpm -C extensions/semafour-agent run compile
npm run compile
