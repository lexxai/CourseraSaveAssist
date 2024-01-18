
cd ..
ver=$(grep \"version\" manifest.json | sed -E 's/^.*: "([0-9.]*)",/\1/' | tr -dc '[0-9.]')
filename="CourseraSaveAssist-${ver}"
git pull origin main
git archive  --worktree-attributes --format=zip --output ../${filename}.zip main