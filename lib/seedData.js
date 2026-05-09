export const STORAGE_KEY = "electrachain.database.v1";

export const STATUS = {
  PENDING_APPROVAL: "Pending Approval",
  PENDING_LISTING: "Pending Admin Approval",
  SOLD: "Sold",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  PENDING_TRANSACTION: "Pending Transaction Approval",
  MINING: "Mining",
  BLOCKCHAIN_CONFIRMED: "Blockchain Confirmed"
};

const LEGACY_USER_IDS = {
  ["usr_" + "de" + "mo_producer"]: "usr_seed_producer",
  ["usr_" + "de" + "mo_consumer"]: "usr_seed_consumer"
};

const LEGACY_EMAILS = {
  ["producer@" + "de" + "mo.com"]: "solar.operator@electrachain.local",
  ["consumer@" + "de" + "mo.com"]: "district.buyer@electrachain.local"
};

export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix) {
  const value =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 18)
      : `${Date.now()}${Math.random().toString(16).slice(2, 10)}`;
  return `${prefix}_${value}`;
}

export function randomHex(length) {
  const alphabet = "0123456789abcdef";
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
}

export function createWalletAddress() {
  return `0x${randomHex(40)}`;
}

export function createSettlementHash() {
  return `0x${randomHex(64)}`;
}

export function nextBlockNumber(db) {
  const highest = db.blockchainLogs.reduce(
    (max, log) => Math.max(max, Number(log.blockNumber) || 0),
    725000
  );
  return highest + 1;
}

export function createWallet(user) {
  const stamp = nowIso();
  return {
    id: makeId("wallet"),
    userId: user.id,
    walletAddress: createWalletAddress(),
    confirmedBalance: 1000,
    pendingBalance: 0,
    energyTokens: 100,
    createdAt: stamp,
    updatedAt: stamp
  };
}

export function createWalletHistoryEntry(wallet, reason = "Wallet opened") {
  return {
    id: makeId("wallet_change"),
    walletId: wallet.id,
    userId: wallet.userId,
    confirmedBalance: Number(wallet.confirmedBalance || 0),
    pendingBalance: Number(wallet.pendingBalance || 0),
    energyTokens: Number(wallet.energyTokens || 0),
    deltaCoins: 0,
    deltaTokens: 0,
    activity: reason,
    createdAt: nowIso()
  };
}

export function createUser({ name, email, password, role, city = "", energyType = "Solar" }) {
  return {
    id: makeId("usr"),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    role: role === "Admin" ? "Admin" : "Energy User",
    city: city.trim(),
    energyType,
    status: STATUS.PENDING_APPROVAL,
    producerVerified: false,
    consumerVerified: false,
    createdAt: nowIso(),
    approvedAt: "",
    rejectedAt: "",
    suspendedAt: ""
  };
}

export function createSeedDatabase() {
  const stamp = nowIso();
  const users = [
    {
      id: "usr_admin_governance",
      name: "ElectraChain Admin",
      email: "admin@electrachain.io",
      password: "admin123",
      role: "Admin",
      city: "Sydney",
      energyType: "Authority Grid",
      status: STATUS.APPROVED,
      producerVerified: false,
      consumerVerified: false,
      createdAt: stamp,
      approvedAt: stamp,
      rejectedAt: "",
      suspendedAt: ""
    },
    {
      id: "usr_seed_producer",
      name: "North Campus Solar Co-op",
      email: "solar.operator@electrachain.local",
      password: "password123",
      role: "Energy User",
      city: "Sydney",
      energyType: "Solar",
      status: STATUS.APPROVED,
      producerVerified: true,
      consumerVerified: false,
      createdAt: stamp,
      approvedAt: stamp,
      rejectedAt: "",
      suspendedAt: ""
    },
    {
      id: "usr_seed_consumer",
      name: "Central District Energy Buyer",
      email: "district.buyer@electrachain.local",
      password: "password123",
      role: "Energy User",
      city: "Parramatta",
      energyType: "Hydro",
      status: STATUS.APPROVED,
      producerVerified: false,
      consumerVerified: false,
      createdAt: stamp,
      approvedAt: stamp,
      rejectedAt: "",
      suspendedAt: ""
    }
  ];

  const wallets = users.map((user, index) => ({
    ...createWallet(user),
    id: ["wallet_admin", "wallet_producer", "wallet_consumer"][index],
    userId: user.id,
    walletAddress: [
      "0xA11CE0000000000000000000000000000000A001",
      "0xBEE700000000000000000000000000000000B002",
      "0xC0FFEE000000000000000000000000000000C003"
    ][index],
    energyTokens: user.email === "solar.operator@electrachain.local" ? 180 : 100,
    createdAt: stamp,
    updatedAt: stamp
  }));

  return {
    users,
    wallets,
    listings: [
      {
        id: "listing_campus_solar",
        producerId: "usr_seed_producer",
        producerName: "North Campus Solar Co-op",
        amount: 80,
        remainingAmount: 80,
        pricePerToken: 4.2,
        energySource: "Solar",
        location: "North Campus Microgrid",
        description: "Rooftop solar surplus from the engineering precinct.",
        status: STATUS.APPROVED,
        createdAt: stamp,
        approvedAt: stamp,
        rejectedAt: ""
      },
      {
        id: "listing_pending_wind",
        producerId: "usr_seed_producer",
        producerName: "North Campus Solar Co-op",
        amount: 24,
        remainingAmount: 24,
        pricePerToken: 3.8,
        energySource: "Wind",
        location: "Harbour Smart District",
        description: "Night-time wind generation awaiting market clearance.",
        status: STATUS.PENDING_LISTING,
        createdAt: stamp,
        approvedAt: "",
        rejectedAt: ""
      }
    ],
    purchaseRequests: [],
    transactions: [],
    walletHistory: wallets.map((wallet) => ({
      ...createWalletHistoryEntry(wallet, "Initial authority wallet allocation"),
      id: `wallet_change_${wallet.id}`,
      createdAt: stamp
    })),
    supportRequests: [],
    approvals: [
      {
        id: "approval_seed",
        type: "System",
        entityId: "seed",
        actorId: "system",
        actorEmail: "system@electrachain.local",
        action: "Seeded authority accounts, wallets, and starter listings",
        status: STATUS.APPROVED,
        note: "LocalStorage fallback initialized",
        createdAt: stamp
      }
    ],
    blockchainLogs: []
  };
}

export function normalizeDatabase(input) {
  const seed = createSeedDatabase();
  const db = input && typeof input === "object" ? input : seed;
  const users = Array.isArray(db.users) ? db.users.map(normalizeUser) : seed.users;
  const wallets = Array.isArray(db.wallets) ? db.wallets.map(normalizeWallet) : seed.wallets;
  const listings = Array.isArray(db.listings)
    ? db.listings.map(normalizeListing)
    : seed.listings;
  const walletHistory = Array.isArray(db.walletHistory)
    ? db.walletHistory.map(normalizeWalletHistory)
    : wallets.map((wallet) => ({
        ...createWalletHistoryEntry(wallet, "Migrated wallet snapshot"),
        id: `wallet_change_${wallet.id}`
      }));

  return {
    users,
    wallets,
    listings,
    purchaseRequests: Array.isArray(db.purchaseRequests)
      ? db.purchaseRequests.map(normalizeRequest)
      : [],
    transactions: Array.isArray(db.transactions) ? db.transactions.map(normalizeTransaction) : [],
    walletHistory,
    supportRequests: Array.isArray(db.supportRequests)
      ? db.supportRequests.map(normalizeSupportRequest)
      : [],
    approvals: Array.isArray(db.approvals) ? db.approvals : seed.approvals,
    blockchainLogs: Array.isArray(db.blockchainLogs) ? db.blockchainLogs : []
  };
}

function normalizeUser(user) {
  const presentationName =
    user.email === "producer@" + "de" + "mo.com" ||
    user.email === "solar.operator@electrachain.local"
      ? "North Campus Solar Co-op"
      : user.email === "consumer@" + "de" + "mo.com" ||
          user.email === "district.buyer@electrachain.local"
        ? "Central District Energy Buyer"
        : user.name;
  const normalizedEmail = LEGACY_EMAILS[user.email] || user.email;

  return {
    ...user,
    id: LEGACY_USER_IDS[user.id] || user.id,
    name: presentationName,
    email: normalizedEmail,
    role: user.role === "Admin" ? "Admin" : "Energy User",
    city: user.city || "",
    energyType: user.energyType || "Solar",
    producerVerified:
      Boolean(user.producerVerified) || user.role === "Producer" || false,
    consumerVerified:
      Boolean(user.consumerVerified) || user.role === "Consumer" || false
  };
}

function normalizeWallet(wallet) {
  return {
    ...wallet,
    userId: LEGACY_USER_IDS[wallet.userId] || wallet.userId
  };
}

function normalizeListing(listing) {
  return {
    ...listing,
    producerId: LEGACY_USER_IDS[listing.producerId] || listing.producerId,
    producerName:
      listing.producerName === "Solar Producer " + "De" + "mo"
        ? "North Campus Solar Co-op"
        : listing.producerName,
    status:
      listing.status === STATUS.PENDING_APPROVAL
        ? STATUS.PENDING_LISTING
        : listing.status === "Pending Listing Approval"
          ? STATUS.PENDING_LISTING
          : listing.status
  };
}

function normalizeRequest(request) {
  return {
    ...request,
    buyerId: LEGACY_USER_IDS[request.buyerId] || request.buyerId,
    sellerId: LEGACY_USER_IDS[request.sellerId] || request.sellerId
  };
}

function normalizeTransaction(transaction) {
  return {
    ...transaction,
    buyerId: LEGACY_USER_IDS[transaction.buyerId] || transaction.buyerId,
    sellerId: LEGACY_USER_IDS[transaction.sellerId] || transaction.sellerId
  };
}

function normalizeWalletHistory(entry) {
  return {
    ...entry,
    userId: LEGACY_USER_IDS[entry.userId] || entry.userId,
    activity: String(entry.activity || "").replaceAll("de" + "mo", "authority")
  };
}

function normalizeSupportRequest(request) {
  const status = ["Open", "In Review", "Replied", "Closed"].includes(request.status)
    ? request.status
    : "Open";

  return {
    id: request.id || makeId("support"),
    userId: LEGACY_USER_IDS[request.userId] || request.userId || "",
    userName: request.userName || request.name || "Energy User",
    userEmail: LEGACY_EMAILS[request.userEmail] || request.userEmail || "",
    category: request.category || "Other",
    subject: request.subject || "Support request",
    message: request.message || "",
    status,
    adminReply: request.adminReply || "",
    createdAt: request.createdAt || nowIso(),
    updatedAt: request.updatedAt || request.createdAt || nowIso()
  };
}
