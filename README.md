# scripts

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

To run specific scripts:
update the file permission to executable using `chmod +x`

```bash 
./dibm.ts
./dis.ts 
./pr.ts 
./brew.ts
```

This project was created using `bun init` in bun v1.1.26. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

# config-files
All config files required to setup machine/project/terminal

# Pre-requisite 
- Install everything from brew.txt as few configs are dependent

# .fzf.zsh 
- Ctrl + R binding config for interactive history with fuzzy search 

# .p10k.zsh 
- Powerlevel10k theme custom setup

# .prettierrc 
- Default prettier config for Web Projects

# .gitignore 
- Starter template for .gitignore

# iTerm Profile 
- Profile > Other Actions > Import JSON Profiles

# did.ts
- Automate deployment to raise the PR against specific branch using BunJS (i.e. did ↩️)

# dis 
- Sync the current branch with any branch (i.e. dis branch_to_sync_with ↩️)

# dibm 
- Create Back merge PR (i.e. dibm ↩️)

# pr
- Create GitHub PR URL against any branch from the current branch (i.e. pr master ↩️)

# sketchybar
- Check sketchybar README.md file for more info