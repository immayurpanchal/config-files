#! /usr/bin/env bun

import { $ } from 'bun'
const brew = async () => {
  await $`brew list > ~/scripts/brew.txt`
}

brew().catch(error => {
  console.error(error)
  process.exit(1)
})