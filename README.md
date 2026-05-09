# ElectraChain

ElectraChain is a university smart-city peer-to-peer energy trading platform. It models Energy Users, Producer/Consumer activity badges, Admin Governance, wallet settlement, marketplace approvals, and a blockchain confirmation flow while still running immediately with browser localStorage.

## Features

- Front page explaining the platform, peer-to-peer flow, user workflows, Admin controls, blockchain settlement, and step-by-step process.
- Admin Control Center for user approvals, activity labels, listing approval, transaction approval, suspension, admin promotion, wallets, analytics, and blockchain logs.
- Energy User workflow for creating sell energy listings that stay hidden until Admin approval.
- Energy User workflow for browsing approved listings and submitting buy energy requests.
- Transaction governance where balances do not settle until Admin approval.
- Wallets with copyable address, confirmed balance, pending settlement exposure, energy token balance, wallet activity, and chart data.
- Wallet connection button and blockchain mining confirmation animation.
- Blockchain explorer with block number, transaction hash, buyer, seller, amount, status, and timestamp.
- Help & Support page for Energy Users to submit support queries and review Admin replies.
- Admin-only Support Center for viewing, replying to, reviewing, and closing user help requests.
- Admin-only Data Management view for users, wallets, listings, purchase requests, settlements, support requests, approvals, blockchain logs, and wallet activity.
- Supabase-ready schema and client module, with automatic localStorage fallback.
- Solidity smart contract in `contracts/EnergyTrading.sol`.

## How To Run

```bash
npm install
npm run dev
```

Open the local Next.js URL shown in the terminal.

## Required Test Flow

1. Login with an approved Admin account.
2. Register a new Energy User.
3. Admin approves the Energy User.
4. Energy User creates a sell energy listing.
5. Admin approves the listing.
6. Register another Energy User.
7. Admin approves the Energy User.
8. Energy User requests a buy purchase from an approved listing.
9. Admin approves the transaction.
10. Wallet balances and energy token balances update after the mining animation.
11. Transaction history shows the completed transaction.
12. Blockchain Explorer shows the confirmed transaction hash.

## Admin Workflow

Admin users can search/filter users, approve registrations, reject accounts, suspend/deactivate accounts, review Producer/Consumer activity labels, promote approved users to Admin, approve/reject sell listings, approve/reject purchase requests, inspect all wallets, view wallet settlement logs, and view blockchain logs.

New approved users automatically receive:

- `1000` EnergyCoins
- `100` Energy Tokens
- A generated wallet address

## Energy User Workflow

Approved Energy Users can both sell and buy energy. A user becomes a Producer activity user after creating a listing and becomes a Consumer activity user after submitting a buy request. A single Energy User can have both badges.

## Sell Energy

Users create listings with amount, price per kWh, source, location, and description. Listings start as `Pending Admin Approval` and appear in the marketplace only after Admin approval.

## Buy Energy

Users browse only Admin-approved listings. A purchase creates a `Pending Transaction Approval` request. Confirmed balances and energy tokens update only after Admin approval and verified blockchain confirmation.

## Energy Blockchain Network

The app includes a local smart energy blockchain infrastructure view without requiring a live public chain. When Admin approves a transaction, the request enters `Mining`, then receives:

- Verified Blockchain Settlement Hash
- Block number
- Timestamp
- `Blockchain Confirmed` status

For smart contract presentations, open `contracts/EnergyTrading.sol` in a Solidity IDE and deploy it to a local chain with a wallet connected to chain ID `1337`.

## LocalStorage Fallback

The app works immediately without Supabase or blockchain services. If Supabase environment keys are missing, ElectraChain automatically uses localStorage. The Admin-only Data Management page shows the active fallback tables and includes a reset button for restoring seed data.

## Supabase Setup

Supabase is setup-ready but not required for the local run.

1. Create a Supabase project.
2. Run `database.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Set `NEXT_PUBLIC_ELECTRACHAIN_DATA_MODE=supabase`.
6. Restart `npm run dev`.

The current local mode keeps credentials in browser storage for controlled academic presentation only. For production, replace local authentication with Supabase Auth and enable row-level security policies.
