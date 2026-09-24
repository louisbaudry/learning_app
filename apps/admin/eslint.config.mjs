// ESLint flat config for the admin panel.
//
// Next 16 removed the `next lint` subcommand that this workspace's lint
// script used to call — with no config file present it silently did
// nothing useful, and after the Next 16 upgrade it failed by reading
// `lint` as a directory name. The script now calls the ESLint CLI
// directly and this file is what it reads.
//
// `eslint-config-next/core-web-vitals` is a superset of the base config:
// it already includes `next` and `next/typescript`, plus the Core Web
// Vitals rules, so importing it alone is the whole Next.js recommended
// set. See https://nextjs.org/docs/app/api-reference/config/eslint
import next from 'eslint-config-next/core-web-vitals'

const config = [
  {
    ignores: ['.next/**', 'out/**', 'next-env.d.ts'],
  },
  ...next,
]

export default config
